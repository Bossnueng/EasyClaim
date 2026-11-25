# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

ARG VITE_BASE_PATH=/bev-claim/
ARG VITE_API_URL=/bev-claim/api
ARG VITE_API_BASE_URL=/bev-claim
ARG VITE_AUTO_CONFIRM_SUBMIT_SECONDS=86400
ARG VITE_AUTO_CONFIRM_RECEIVE_SECONDS=259200
ENV VITE_BASE_PATH=$VITE_BASE_PATH \
    VITE_API_URL=$VITE_API_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTO_CONFIRM_SUBMIT_SECONDS=$VITE_AUTO_CONFIRM_SUBMIT_SECONDS \
    VITE_AUTO_CONFIRM_RECEIVE_SECONDS=$VITE_AUTO_CONFIRM_RECEIVE_SECONDS

RUN npm run build

FROM nginx:1.27-alpine
ENV TZ=Asia/Bangkok
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/bev-claim
# เขียน env-config.js จาก environment ของ pod ตอน container เริ่ม (เวลา auto-confirm ต่อ environment)
COPY docker/40-bev-claim-config.sh /docker-entrypoint.d/40-bev-claim-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-bev-claim-config.sh \
 && chmod 755 /docker-entrypoint.d/40-bev-claim-config.sh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
