import os
import time
import logging
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vision-attend-ai")

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(title="VisionAttend AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------------
UPLOAD_DIR = "uploads"
EMBEDDING_DIR = "embeddings"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EMBEDDING_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# TWO-PHASE InsightFace setup:
#   Phase 1: Detection-only model (~100ms) — fast gate, rejects no-face frames
#   Phase 2: Full detection+recognition model (~1.7s) — only when face detected
# ---------------------------------------------------------------------------
import insightface

logger.info("Loading InsightFace models …")

# FAST detector — used for quick face presence check
fast_detector = insightface.app.FaceAnalysis(
    name="buffalo_l",
    allowed_modules=["detection"],
    providers=["CPUExecutionProvider"],
)
fast_detector.prepare(ctx_id=0, det_size=(160, 160))
logger.info("  ✓ Fast detector loaded (detection-only, 160x160)")

# FULL recognizer — used only when fast detector finds a face
full_recognizer = insightface.app.FaceAnalysis(
    name="buffalo_l",
    allowed_modules=["detection", "recognition"],
    providers=["CPUExecutionProvider"],
)
full_recognizer.prepare(ctx_id=0, det_size=(320, 320))
logger.info("  ✓ Full recognizer loaded (detection+recognition, 320x320)")

logger.info("InsightFace models ready.")

# ---------------------------------------------------------------------------
# In-memory embedding store
# All embeddings are L2-normalized for dot-product similarity
# ---------------------------------------------------------------------------
embedding_cache: dict[str, np.ndarray] = {}
_emb_matrix: np.ndarray | None = None   # (N, 512) matrix for batch matching
_emb_ids: list[str] = []


def _normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


def _rebuild_matrix():
    global _emb_matrix, _emb_ids
    if len(embedding_cache) == 0:
        _emb_matrix = None
        _emb_ids = []
        return
    _emb_ids = list(embedding_cache.keys())
    _emb_matrix = np.stack([embedding_cache[sid] for sid in _emb_ids])


def _load_embeddings_from_disk():
    count = 0
    for fname in os.listdir(EMBEDDING_DIR):
        if fname.endswith(".npy"):
            student_id = fname.replace(".npy", "")
            try:
                vec = np.load(os.path.join(EMBEDDING_DIR, fname))
                embedding_cache[student_id] = _normalize(vec)
                count += 1
            except Exception as e:
                logger.warning("Failed to load embedding %s: %s", fname, e)
    _rebuild_matrix()
    logger.info("Loaded %d embeddings from disk.", count)


_load_embeddings_from_disk()

# ---------------------------------------------------------------------------
# Tuning
# ---------------------------------------------------------------------------
RECOGNITION_THRESHOLD = 0.30   # lowered for real-world webcam tolerance
MAX_IMAGE_DIM = 480            # cap incoming image size
FAST_DET_MAX_DIM = 320         # smaller image for fast detection gate


def _bytes_to_cv2(data: bytes) -> np.ndarray | None:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


def _resize(img: np.ndarray, max_dim: int) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return img


def _batch_match(query_embs: np.ndarray) -> list[tuple[str, float]]:
    if _emb_matrix is None:
        return []
    sim_matrix = query_embs @ _emb_matrix.T   # (M, N) — single numpy call
    results: list[tuple[str, float]] = []
    seen: set[str] = set()
    for i in range(sim_matrix.shape[0]):
        best_idx = int(np.argmax(sim_matrix[i]))
        best_sim = float(sim_matrix[i, best_idx])
        if best_sim >= RECOGNITION_THRESHOLD:
            sid = _emb_ids[best_idx]
            if sid not in seen:
                seen.add(sid)
                results.append((sid, best_sim))
    return results


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
def home():
    return {
        "status": "AI Service running (two-phase fast mode)",
        "registered_faces": len(embedding_cache),
    }


@app.post("/register-face")
async def register_face(studentId: str = Form(...), image: UploadFile = File(...)):
    t0 = time.perf_counter()
    contents = await image.read()
    img = _bytes_to_cv2(contents)
    if img is None:
        return {"success": False, "message": "Could not decode the uploaded image."}

    # Use full recognizer for registration (need accurate embedding)
    faces = full_recognizer.get(img)
    if len(faces) == 0:
        return {
            "success": False,
            "message": "No face detected. Please ensure your face is clearly visible, well-lit, and facing the camera.",
        }
    if len(faces) > 1:
        return {
            "success": False,
            "message": "Multiple faces detected. Please ensure only your face is in the frame.",
        }

    embedding = _normalize(faces[0].embedding)

    # Persist
    with open(os.path.join(UPLOAD_DIR, f"{studentId}.jpg"), "wb") as f:
        f.write(contents)
    np.save(os.path.join(EMBEDDING_DIR, f"{studentId}.npy"), embedding)

    embedding_cache[studentId] = embedding
    _rebuild_matrix()

    elapsed = (time.perf_counter() - t0) * 1000
    logger.info("Registered student %s in %.0fms", studentId, elapsed)
    return {"success": True, "message": "Face registered successfully"}


@app.post("/recognize")
async def recognize(image: UploadFile = File(...)):
    """
    TWO-PHASE recognition for maximum speed:
    Phase 1: Fast detection gate (~100ms) — quickly reject frames with no face
    Phase 2: Full recognition (~1.7s) — only runs when face is detected
    """
    t0 = time.perf_counter()

    if len(embedding_cache) == 0:
        return {"recognized": False, "message": "No registered faces in the system yet."}

    contents = await image.read()
    img = _bytes_to_cv2(contents)
    if img is None:
        return {"recognized": False, "message": "Could not decode the camera frame."}

    # ===== PHASE 1: Fast detection gate (~100ms) =====
    img_fast = _resize(img, FAST_DET_MAX_DIM)
    fast_faces = fast_detector.get(img_fast)

    if len(fast_faces) == 0:
        elapsed = (time.perf_counter() - t0) * 1000
        logger.debug("No face (fast gate: %.0fms)", elapsed)
        return {"recognized": False, "message": "No face detected in frame."}

    t1 = time.perf_counter()
    phase1_ms = (t1 - t0) * 1000

    # ===== PHASE 2: Full recognition (only runs if face found) =====
    img_full = _resize(img, MAX_IMAGE_DIM)
    full_faces = full_recognizer.get(img_full)

    if len(full_faces) == 0:
        elapsed = (time.perf_counter() - t0) * 1000
        logger.debug("Face lost in full pass (%.0fms)", elapsed)
        return {"recognized": False, "message": "Face detected but could not extract features. Try again."}

    query_embs = np.stack([_normalize(f.embedding) for f in full_faces])
    matches = _batch_match(query_embs)

    elapsed = (time.perf_counter() - t0) * 1000
    phase2_ms = elapsed - phase1_ms

    if len(matches) == 0:
        logger.debug("Face(s) not matched (gate=%.0fms, recog=%.0fms, total=%.0fms)",
                      phase1_ms, phase2_ms, elapsed)
        return {
            "recognized": False,
            "message": "Face detected but does not match any registered student.",
        }

    matched_ids = [m[0] for m in matches]
    best_sim = max(m[1] for m in matches)

    logger.info("Recognized %s (sim=%.3f) — gate=%.0fms, recog=%.0fms, total=%.0fms",
                matched_ids, best_sim, phase1_ms, phase2_ms, elapsed)

    return {
        "recognized": True,
        "studentId": matched_ids[0],
        "studentIds": matched_ids,
        "distance": round(best_sim, 4),
        "message": f"Recognized {len(matched_ids)} student(s) successfully",
    }


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
