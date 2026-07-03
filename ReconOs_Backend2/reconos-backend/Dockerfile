# ReconOS API — Render Docker deploy
# Bust stale layer cache: set CACHEBUST in Render env, or use "Clear build cache & deploy"

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
# Render maps service env vars → Docker build-args. Bump CACHEBUST or use
# Manual Deploy → "Clear build cache & deploy" if a free-tier build looks stale.
ARG CACHEBUST=1
ARG RENDER_GIT_COMMIT=local
RUN echo "ReconOS API commit=${RENDER_GIT_COMMIT} cachebust=${CACHEBUST}"
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build && test -f dist/main.js

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install prisma@5 --no-save
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 10000
ENV PORT=10000
ENTRYPOINT ["./docker-entrypoint.sh"]
