FROM python:3.11-slim

# System deps needed by numpy, Pillow, scikit-learn, PyTorch CPU
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- PyTorch CPU (requirements.txt uses +cpu suffix which requires the PyTorch wheel index) ---
RUN pip install --no-cache-dir \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# --- All other dependencies (prod-only slim list) ---
COPY app/backend/requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# --- Application source ---
COPY app/backend/app/ ./app/

# --- ML model files (baked into image — no volume needed for models) ---
COPY app/backend/data/ ./data/

# Persistent DB lives at /dbdata (Railway volume); avatars at /app/static/avatars
RUN mkdir -p /dbdata /app/static/avatars

EXPOSE 8001

# Railway injects $PORT; fall back to 8001 for local docker run
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
