# Multi-stage Dockerfile for the Next.js frontend

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked in at build time.
# Override via: docker compose build --build-arg NEXT_PUBLIC_BACKEND_WS_URL=ws://your-host:8080
ARG NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8080
ENV NEXT_PUBLIC_BACKEND_WS_URL=$NEXT_PUBLIC_BACKEND_WS_URL

ARG NEXT_PUBLIC_OWNER_NAME=""
ENV NEXT_PUBLIC_OWNER_NAME=$NEXT_PUBLIC_OWNER_NAME
ARG NEXT_PUBLIC_OWNER_STREET=""
ENV NEXT_PUBLIC_OWNER_STREET=$NEXT_PUBLIC_OWNER_STREET
ARG NEXT_PUBLIC_OWNER_CITY=""
ENV NEXT_PUBLIC_OWNER_CITY=$NEXT_PUBLIC_OWNER_CITY
ARG NEXT_PUBLIC_OWNER_COUNTRY=""
ENV NEXT_PUBLIC_OWNER_COUNTRY=$NEXT_PUBLIC_OWNER_COUNTRY
ARG NEXT_PUBLIC_OWNER_EMAIL=""
ENV NEXT_PUBLIC_OWNER_EMAIL=$NEXT_PUBLIC_OWNER_EMAIL
ARG NEXT_PUBLIC_OWNER_PHONE=""
ENV NEXT_PUBLIC_OWNER_PHONE=$NEXT_PUBLIC_OWNER_PHONE

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production runtime using Next.js standalone output
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
