FROM ghcr.io/muhammedjalahej/bonus-life-ai:base

WORKDIR /app

RUN pip install --no-cache-dir pandas==2.2.3

# Application source
COPY app/backend/app/ ./app/

# ML model files (baked into image)
COPY app/backend/data/ ./data/

# Persistent DB lives at /dbdata (Railway volume); avatars at /app/static/avatars
RUN mkdir -p /dbdata /app/static/avatars

EXPOSE 8001

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
