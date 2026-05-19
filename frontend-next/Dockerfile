# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps

# libc6-compat is required by some native Node.js packages on Alpine.
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
#   API_URL_INTERNAL is the server-side proxy destination (Fly internal network).
#   Both must be passed as build args — see fly.toml [build.args].
ARG NEXT_PUBLIC_API_URL=https://api.clockly.es
ARG NEXT_PUBLIC_APP_NAME=ClockLy
ARG API_URL_INTERNAL=http://clockly-api.internal:8000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV API_URL_INTERNAL=$API_URL_INTERNAL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_URL=https://api.clockly.es
ARG NEXT_PUBLIC_APP_NAME=ClockLy
ARG API_URL_INTERNAL=http://clockly-api.internal:8000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV API_URL_INTERNAL=$API_URL_INTERNAL

RUN apk add --no-cache libc6-compat

# Non-root user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser  --system --uid 1001 nextjs

WORKDIR /app

# Copy standalone server and co-located assets.
# .next/standalone already contains only the production node_modules it needs.
COPY --from=builder /app/public                    ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000

# Next.js standalone server reads PORT and HOSTNAME from the environment.
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
