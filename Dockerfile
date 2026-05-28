FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev ffmpeg && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -m -u 1000 user

ENV HOME=/home/user \
    PATH=/usr/local/bin:/home/user/.local/bin:$PATH

WORKDIR /home/user/app

COPY --from=builder /install /usr/local
COPY --chown=user:user backend/ .

RUN chmod +x entrypoint.sh && \
    mkdir -p tmp output && \
    chown -R user:user tmp output

USER user

EXPOSE 7860

CMD ["./entrypoint.sh"]
