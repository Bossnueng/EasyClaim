# syntax=docker/dockerfile:1
# Build context = ./backend  (node_modules และ .env ของเครื่องจะไม่ถูกคัดลอก เพราะ COPY เฉพาะไฟล์ที่ต้องใช้)

# ---------- Stage 1: install production dependencies ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- Stage 2: runtime ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    TZ=Asia/Bangkok \
    PORT=5001
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY index.js ./
COPY socket ./socket
COPY database ./database
COPY src/config ./src/config
COPY src/controllers ./src/controllers
COPY src/middleware ./src/middleware
COPY src/routes ./src/routes
COPY src/utils ./src/utils

RUN mkdir -p src/uploads/claims src/uploads/claimsreturn src/uploads/signatures

EXPOSE 5001
CMD ["node", "index.js"]
