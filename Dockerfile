FROM node:20-bookworm-slim AS base

# Install dependencies for Playwright Chromium + bcrypt build tools
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libx11-6 libx11-xcb1 libxcb1 libxext6 libxfixes3 libxi6 \
    libxtst6 fonts-liberation fonts-noto-color-emoji \
    ca-certificates wget python3 make g++ --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (no --ignore-scripts so bcrypt compiles)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# Install Playwright Chromium
RUN npx playwright install chromium

# Copy source and build
COPY . .
RUN npm run build

# Create data directory
RUN mkdir -p /data/pdfs

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV HOSTNAME=0.0.0.0

# Start: push schema, seed users, then start app
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts; npm start"]
