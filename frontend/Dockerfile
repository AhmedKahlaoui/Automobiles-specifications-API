# syntax=docker/dockerfile:1

FROM node:20-slim

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources (useful for non-volume runs); when using docker-compose, bind mount overrides this.
COPY . .

EXPOSE 5173

# Vite must listen on 0.0.0.0 inside the container to be reachable from the host browser.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
