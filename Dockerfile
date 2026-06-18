FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
ENV PORT=8001
CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT} --workers 1
