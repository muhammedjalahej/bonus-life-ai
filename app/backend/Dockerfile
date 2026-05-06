FROM python:3.11-slim

# libgomp1 needed by scikit-learn/numpy at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- All dependencies (prod-only slim list, torch excluded — lazy-loaded) ---
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
