# syntax=docker/dockerfile:1

# ---------- Stage 1: build React (Vite) ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

ARG VITE_API_URL=/api
ARG VITE_API_BASE_URL=
ARG VITE_AUTO_CONFIRM_SUBMIT_SECONDS=86400
ARG VITE_AUTO_CONFIRM_RECEIVE_SECONDS=259200
ENV VITE_API_URL=$VITE_API_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTO_CONFIRM_SUBMIT_SECONDS=$VITE_AUTO_CONFIRM_SUBMIT_SECONDS \
    VITE_AUTO_CONFIRM_RECEIVE_SECONDS=$VITE_AUTO_CONFIRM_RECEIVE_SECONDS

RUN npm run build

# ---------- Stage 2: serve with Nginx ----------
FROM nginx:1.27-alpine
ENV TZ=Asia/Bangkok
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
