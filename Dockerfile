# Data Deployer - Single Container with Nginx + Node.js
# Base image with Node.js
FROM node:18-alpine

# Install Nginx and Supervisor (to manage multiple processes)
RUN apk add --no-cache nginx supervisor curl

# Create app directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install Node.js dependencies
RUN cd server && npm ci --only=production

# Copy server code
COPY server/ ./server/

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
