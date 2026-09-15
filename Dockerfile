# Multi-stage Dockerfile for Neon Sketch Arena (AWS Free Tier compatible)

# Stage 1: Build Frontend and Backend dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package.json
COPY package.json ./

# Copy backend and frontend source
COPY backend ./backend
COPY frontend ./frontend

# Install dependencies and build static frontend bundle
RUN cd frontend && npm install && npm run build
RUN cd backend && npm install --omit=dev

# Stage 2: Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001

CMD ["node", "backend/index.js"]
