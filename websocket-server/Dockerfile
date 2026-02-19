# Multi-stage build for WebSocket server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy Prisma schema (symlink won't work in Docker)
COPY --from=builder /app/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Expose ports
EXPOSE 8080 8081

# Start server
CMD ["node", "dist/server.js"]
