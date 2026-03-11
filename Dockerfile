# Stage 1: Build frontend
FROM node:22-alpine AS web-builder
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci && npm i @rollup/rollup-linux-x64-musl --no-save
COPY web/ .
RUN npx vite build

# Stage 2: Build backend
FROM node:22-alpine AS api-builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=api-builder /app/dist ./dist
COPY --from=api-builder /app/src/db/migrations ./dist/db/migrations
COPY --from=web-builder /app/dist ./dist/public

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/seymour.db

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "dist/index.js"]
