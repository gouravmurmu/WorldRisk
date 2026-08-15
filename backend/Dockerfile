FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Shell form so $PORT (set by Render/Fly/most PaaS hosts) expands at
# container start; falls back to 8000 for plain `docker run`/compose.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
