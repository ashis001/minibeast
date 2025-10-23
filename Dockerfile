# Data Deployer - Full Stack Container with React + Node.js + Nginx
# Multi-stage build for optimized production image
FROM node:18-alpine AS frontend-builder

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:3002
ARG VITE_AUTH_SERVER_URL=http://localhost:8000

# Build React frontend
WORKDIR /app/frontend
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY index.html ./
COPY .env* ./
COPY src/ ./src/
COPY public/ ./public/

# Set environment variables from build args
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH_SERVER_URL=$VITE_AUTH_SERVER_URL

# Install dependencies and build
RUN npm ci && npm run build

# Production stage
FROM node:18-alpine

# Install Nginx and Supervisor (to manage multiple processes)
RUN apk add --no-cache nginx supervisor curl

# Create app directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install Node.js dependencies
RUN cd server && npm ci --only=production

# Copy server code and env files
COPY server/ ./server/
COPY server/.env* ./server/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./public/

# Copy Nginx configuration
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisord.conf

# Create required directories with proper permissions
RUN mkdir -p /app/server/uploads \
    /app/server/deployments/modules \
    /app/server/logs \
    /var/log/nginx \
    /var/log/supervisor \
    /run/nginx \
    && chown -R node:node /app \
    && chown -R node:node /var/log/nginx \
    && chown -R node:node /run/nginx \
    && chmod -R 777 /app/server/uploads \
    && chmod -R 777 /app/server/deployments

# Expose port 80 (Nginx)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start supervisor (manages both Nginx and Node.js)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
