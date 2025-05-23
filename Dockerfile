FROM node:22-alpine AS base

FROM base AS api-deps
WORKDIR /app

COPY api/package.json api/yarn.lock* ./
RUN yarn --frozen-lockfile

FROM base AS api-builder
WORKDIR /app
COPY --from=api-deps /app/node_modules ./node_modules
COPY api/ .

RUN yarn prisma generate
RUN yarn build
RUN rm -rf src/

FROM base AS frontend-deps
WORKDIR /app

COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn --frozen-lockfile

FROM base AS frontend-builder
WORKDIR /app
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY frontend/ .

RUN yarn build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=api-builder /app .
COPY --from=frontend-builder /app/dist public/

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

LABEL org.opencontainers.image.source="https://github.com/DerLev/sandwich-spawnpoint"
LABEL org.opencontainers.image.licenses="MIT"

CMD [ "node", "dist/index.js" ]
