# ============================================================
# 관리자(Next.js) Docker — standalone 빌드, 포트 5003
# ============================================================

# 1. Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install

COPY . .

# 관리자 API 주소(빌드 시 인라인). 필요 시 아래처럼 주입:
#   docker build --build-arg NEXT_PUBLIC_API_BASE=https://api.example.com -t admin:v1 .
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

# Next.js standalone 모드 빌드
ENV NODE_ENV=production
RUN npm run build

# 2. Production image
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5003
ENV HOSTNAME=0.0.0.0

# standalone 디렉토리 복사 (Next.js가 빌드 시 생성)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 5003

CMD ["node", "server.js"]
