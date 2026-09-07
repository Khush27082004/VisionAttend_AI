FROM python:3.10-slim

WORKDIR /app

# Install system libraries needed by OpenCV and InsightFace C++ extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Set up runtime directories
RUN mkdir -p uploads embeddings /root/.insightface

# Support dynamic PORT environment variable (Hugging Face Spaces uses 7860, Render uses PORT, default is 8000)
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
