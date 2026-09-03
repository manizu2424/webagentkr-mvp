# syntax=docker/dockerfile:1
# Next.js standalone 멀티스테이지 (기술 스펙 §8 — 스펙엔 없어 신규 작성, 결함 #17)
# next.config.ts 의 output: "standalone" 산출물만 담아 이미지를 가볍게 유지한다.

FROM node:24-alpine AS base

# ── deps: 의존성만 설치 (레이어 캐시) ──────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder: 앱 빌드 ─────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* 는 빌드 시점에 클라이언트 번들로 인라인된다.
# 배포 시 compose 에서 build args 로 넘기거나 CI 에서 주입할 것:
#   ARG NEXT_PUBLIC_SUPABASE_URL / ARG NEXT_PUBLIC_SUPABASE_ANON_KEY / ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_GA4_MEASUREMENT_ID=$NEXT_PUBLIC_GA4_MEASUREMENT_ID
RUN npm run build

# ── runner: 최종 이미지 ─────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
