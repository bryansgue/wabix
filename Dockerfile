# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: Setup Server & Final Image ---
FROM node:20-bullseye-slim

WORKDIR /app

# Install system dependencies (ffmpeg for audio processing)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg \
	&& rm -rf /var/lib/apt/lists/*

# Copy Server Dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy Server Code
COPY server/ ./

# Generate Prisma Client inside the image
RUN npx prisma generate

# Copy Built Frontend from Stage 1
COPY --from=builder /app/client/dist ./public

# Create auth directory
RUN mkdir -p auth_info && chown -R node:node auth_info
RUN mkdir -p data && chown -R node:node data

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production
ENV IS_DOCKER=true

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "index.js"]
