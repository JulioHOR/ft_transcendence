FROM debian:bookworm

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY app/requirements.txt .
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

COPY app/ ./
COPY tools/init_backend.sh /usr/local/bin/init_backend.sh
RUN chmod +x /usr/local/bin/init_backend.sh

ENTRYPOINT ["init_backend.sh"]
