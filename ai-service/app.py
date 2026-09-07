import os
import time
import logging
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import insightface

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
# HIGH-SPEED InsightFace Model (buffalo_sc: SCRFD + MobileFaceNet)
# Sub-60ms detection + 512-dim ArcFace embedding extraction on CPU
# ---------------------------------------------------------------------------
logger.info("Initializing high-speed InsightFace FaceAnalysis (buffalo_sc)...")
face_app = insightface.app.FaceAnalysis(
    name="buffalo_sc",
    allowed_modules=["detection", "recognition"],
    providers=["CPUExecutionProvider"],
)
face_app.prepare(ctx_id=0, det_size=(320, 320))
logger.info("✓ InsightFace buffalo_sc model loaded and prepared.")

# ---------------------------------------------------------------------------
# In-memory embedding store
# All embeddings are L2-normalized for instant dot-product cosine similarity
# ---------------------------------------------------------------------------
embedding_cache: dict[str, np.ndarray] = {}
_emb_matrix: np.ndarray | None = None   # (N, 512) matrix for batch matching
_emb_ids: list[str] = []


def _normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return (v / n).astype(np.float32) if n > 0 else v.astype(np.float32)


def _rebuild_matrix():
    global _emb_matrix, _emb_ids
    if len(embedding_cache) == 0:
        _emb_matrix = None
        _emb_ids = []
        return
    _emb_ids = list(embedding_cache.keys())
    _emb_matrix = np.stack([embedding_cache[sid] for sid in _emb_ids])


def _sync_and_load_embeddings():
    """Load embeddings from disk and generate any missing ones from uploads."""
    embedding_cache.clear()
    count = 0
    # First load all valid existing .npy files
    if os.path.exists(EMBEDDING_DIR):
        for fname in os.listdir(EMBEDDING_DIR):
            if fname.endswith(".npy"):
                student_id = fname.replace(".npy", "")
                try:
                    vec = np.load(os.path.join(EMBEDDING_DIR, fname))
                    if vec.shape == (512,):
                        embedding_cache[student_id] = _normalize(vec)
                        count += 1
                except Exception as e:
                    logger.warning("Failed to load embedding %s: %s", fname, e)

    # If any student image in uploads is missing an embedding, generate it
    if os.path.exists(UPLOAD_DIR):
        for img_name in os.listdir(UPLOAD_DIR):
            if img_name.endswith((".jpg", ".jpeg", ".png")):
                student_id = os.path.splitext(img_name)[0]
                if student_id not in embedding_cache:
                    try:
                        img = cv2.imread(os.path.join(UPLOAD_DIR, img_name))
                        if img is not None:
                            faces = face_app.get(img)
                            if len(faces) > 0:
                                emb = _normalize(faces[0].embedding)
                                np.save(os.path.join(EMBEDDING_DIR, f"{student_id}.npy"), emb)
                                embedding_cache[student_id] = emb
                                count += 1
                                logger.info("Generated missing embedding for %s", student_id)
                    except Exception as e:
                        logger.warning("Error generating embedding for %s: %s", student_id, e)

    _rebuild_matrix()
    logger.info("Loaded & synchronized %d embeddings from disk.", count)


# Load and pre-sync embeddings
_sync_and_load_embeddings()

# ---------------------------------------------------------------------------
# Pre-warm model with dummy frame for 0 cold-start latency on first user scan
# ---------------------------------------------------------------------------
try:
    dummy_frame = np.zeros((320, 320, 3), dtype=np.uint8)
    face_app.get(dummy_frame)
    logger.info("✓ Model pre-warmed successfully.")
except Exception as e:
    logger.warning("Model warmup warning: %s", e)

# ---------------------------------------------------------------------------
# Tuning
# ---------------------------------------------------------------------------
RECOGNITION_THRESHOLD = 0.35   # Optimal threshold for MobileFaceNet ArcFace
MAX_IMAGE_DIM = 320            # Optimal input size for real-time webcam frame processing


def _bytes_to_cv2(data: bytes) -> np.ndarray | None:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


def _resize(img: np.ndarray, max_dim: int) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
    return img


def _batch_match(query_embs: np.ndarray) -> list[tuple[str, float]]:
    if _emb_matrix is None:
        return []
    # (M, 512) @ (512, N) -> (M, N) matrix multiplication in <0.1ms
    sim_matrix = query_embs @ _emb_matrix.T
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
        "status": "AI Service running (ultra-fast real-time mode)",
        "model": "InsightFace buffalo_sc",
        "registered_faces": len(embedding_cache),
    }


@app.post("/register-face")
async def register_face(studentId: str = Form(...), image: UploadFile = File(...)):
    t0 = time.perf_counter()
    contents = await image.read()
    img = _bytes_to_cv2(contents)
    if img is None:
        return {"success": False, "message": "Could not decode the uploaded image."}

    faces = face_app.get(img)
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

    # Persist photo and embedding
    with open(os.path.join(UPLOAD_DIR, f"{studentId}.jpg"), "wb") as f:
        f.write(contents)
    np.save(os.path.join(EMBEDDING_DIR, f"{studentId}.npy"), embedding)

    embedding_cache[studentId] = embedding
    _rebuild_matrix()

    elapsed = (time.perf_counter() - t0) * 1000
    logger.info("Registered student %s in %.1fms", studentId, elapsed)
    return {"success": True, "message": "Face registered successfully"}


@app.post("/recognize")
async def recognize(image: UploadFile = File(...)):
    """
    ULTRA-FAST single-pass face detection + ArcFace recognition:
    Processes and recognizes faces in under 50-80ms on CPU.
    """
    t0 = time.perf_counter()

    if len(embedding_cache) == 0:
        return {"recognized": False, "message": "No registered faces in the system yet."}

    contents = await image.read()
    img = _bytes_to_cv2(contents)
    if img is None:
        return {"recognized": False, "message": "Could not decode the camera frame."}

    # Resize to optimal inference dimension
    img_opt = _resize(img, MAX_IMAGE_DIM)
    
    # Single-pass fast detection and feature extraction
    faces = face_app.get(img_opt)

    if len(faces) == 0:
        elapsed = (time.perf_counter() - t0) * 1000
        logger.debug("No face detected (%.1fms)", elapsed)
        return {"recognized": False, "message": "No face detected in frame."}

    query_embs = np.stack([_normalize(f.embedding) for f in faces])
    matches = _batch_match(query_embs)

    elapsed = (time.perf_counter() - t0) * 1000

    if len(matches) == 0:
        logger.debug("Face(s) not matched (total=%.1fms)", elapsed)
        return {
            "recognized": False,
            "message": "Face detected but does not match any registered student.",
        }

    matched_ids = [m[0] for m in matches]
    best_sim = max(m[1] for m in matches)

    logger.info("⚡ Recognized %s (sim=%.3f) in %.1fms", matched_ids, best_sim, elapsed)

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
