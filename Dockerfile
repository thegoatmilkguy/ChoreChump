# Stage 1: Build Frontend & Backend
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm test && npm run build

# Stage 2: Lightweight Production Image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV CHORECHUMP_DATA_DIR=/data

# Create persistent SQLite volume directory
RUN mkdir -p /data

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "dist/server/index.js"]
