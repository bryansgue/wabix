FROM node:20-alpine

WORKDIR /app

# Install system dependencies (for ffmpeg, prisma, etc)
RUN apk add --no-cache openssl ffmpeg

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Validate and Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
