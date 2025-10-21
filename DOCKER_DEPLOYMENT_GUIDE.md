# 🐳 Data Deployer - Docker Deployment Guide

Deploy the Data Deployer backend server anywhere using Docker. This guide provides a single-container solution with Nginx and Node.js running together.

---

## 📋 Prerequisites

- **Docker Engine** 20.10+ installed
- **Docker Compose** 2.0+ installed
- **Git** for cloning the repository
- **2GB+ RAM** on the host machine
- **10GB+ disk space**

---

## 🎯 Architecture

```
┌─────────────────────────────────────┐
│     Docker Container                │
│                                     │
│  ┌──────────┐      ┌────────────┐ │
│  │  Nginx   │─────▶│  Node.js   │ │
│  │ (Port 80)│      │ (Port 3002)│ │
│  └──────────┘      └────────────┘ │
│                                     │
│  Managed by Supervisor              │
└─────────────────────────────────────┘
           ▲
           │
      Internet
```

**Key Features:**
- ✅ Single container (Nginx + Node.js)
- ✅ Supervisor manages both processes
- ✅ Auto-restart on failure
- ✅ Health checks built-in
- ✅ Persistent data with volumes
- ✅ CORS enabled

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Clone repository
git clone <your-repo-url>
cd data-deployer-main

# 2. Build and start
docker-compose up -d

# 3. Verify
curl http://localhost
```

That's it! Server is running on port 80.

---

## 📦 Detailed Installation

### Step 1: Install Docker

#### On Ubuntu/Debian:
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Add your user to docker group (optional)
sudo usermod -aG docker $USER
newgrp docker
```

#### On macOS:
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

#### On Windows:
```powershell
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

### Step 2: Verify Installation

```bash
docker --version
docker compose version
```

Expected output:
```
Docker version 24.0.0+
Docker Compose version v2.20.0+
```

---

## 🔧 Deployment Options

### Option A: Using Docker Compose (Recommended)

#### 1. Clone Repository
```bash
git clone <your-repo-url>
cd data-deployer-main
```

#### 2. Start Services
```bash
docker-compose up -d
```

Expected output:
```
Creating network "data-deployer-network" ... done
Creating data-deployer ... done
```

#### 3. Check Status
```bash
docker-compose ps
```

Expected output:
```
NAME            IMAGE                    STATUS         PORTS
data-deployer   data-deployer-main:latest   Up 30 seconds  0.0.0.0:80->80/tcp
```

#### 4. View Logs
```bash
docker-compose logs -f
```

### Option B: Using Docker CLI (Manual)

#### 1. Build Image
```bash
docker build -t data-deployer:latest .
```

#### 2. Create Data Directories
```bash
mkdir -p data/uploads data/deployments data/logs
```

#### 3. Run Container
```bash
docker run -d \
  --name data-deployer \
  -p 80:80 \
  -v $(pwd)/data/uploads:/app/server/uploads \
  -v $(pwd)/data/deployments:/app/server/deployments \
  -v $(pwd)/data/logs:/app/server/logs \
  --restart unless-stopped \
  data-deployer:latest
```

---

## ✅ Verification

### 1. Health Check
```bash
curl http://localhost/health
```

### 2. Check Container Logs
```bash
docker logs data-deployer
```

### 3. Check Running Processes Inside Container
```bash
docker exec data-deployer ps aux
```

You should see both Nginx and Node.js processes:
```
PID   USER     COMMAND
1     root     /usr/bin/supervisord
12    root     nginx: master process
13    nginx    nginx: worker process
14    node     node /app/server/server.js
```

### 4. Test API Endpoint
```bash
curl -I http://localhost
```

Expected headers:
```
HTTP/1.1 404 Not Found
Server: nginx
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

---

## 🔄 Common Operations

### View Logs
```bash
# All logs
docker-compose logs -f

# Only Node.js logs
docker-compose logs -f | grep nodejs

# Only Nginx logs
docker-compose logs -f | grep nginx
```

### Restart Container
```bash
docker-compose restart
```

### Stop Container
```bash
docker-compose stop
```

### Start Stopped Container
```bash
docker-compose start
```

### Stop and Remove Container
```bash
docker-compose down
```

### Rebuild After Code Changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Execute Commands Inside Container
```bash
# Open shell
docker exec -it data-deployer sh

# Check Node.js version
docker exec data-deployer node --version

# Check Nginx configuration
docker exec data-deployer nginx -t
```

---

## 🔄 Updates and Maintenance

### Update to Latest Code

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Clean Up Old Images

```bash
# Remove unused images
docker image prune -a

# Remove all stopped containers
docker container prune
```

### Backup Data

```bash
# Create backup of persistent data
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

### Restore Data

```bash
# Extract backup
tar -xzf backup-20250101.tar.gz
```

---

## 🌐 Deploy to Cloud Providers

### DigitalOcean (Droplet)

```bash
# 1. Create Droplet (Ubuntu 22.04, $6/month)
# 2. SSH into droplet
ssh root@YOUR_DROPLET_IP

# 3. Install Docker
curl -fsSL https://get.docker.com | sh

# 4. Clone and deploy
git clone <your-repo-url>
cd data-deployer-main
docker-compose up -d

# 5. Access
curl http://YOUR_DROPLET_IP
```

### AWS EC2

```bash
# 1. Launch EC2 instance (t2.micro, Ubuntu 22.04)
# 2. SSH into instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# 3. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# 4. Clone and deploy
git clone <your-repo-url>
cd data-deployer-main
docker-compose up -d
```

### Google Cloud Platform (GCE)

```bash
# 1. Create VM instance (e2-micro, Ubuntu 22.04)
# 2. SSH into instance
gcloud compute ssh YOUR_INSTANCE_NAME

# 3. Install Docker
curl -fsSL https://get.docker.com | sh

# 4. Clone and deploy
git clone <your-repo-url>
cd data-deployer-main
docker-compose up -d
```

---

## 🔒 Production Best Practices

### 1. Use Environment Variables

Create a `.env` file:
```bash
NODE_ENV=production
PORT=3002
AWS_REGION=us-east-1
```

Update `docker-compose.yml`:
```yaml
services:
  data-deployer:
    env_file:
      - .env
```

### 2. Setup SSL/HTTPS

Using Let's Encrypt with Nginx:
```bash
# Install certbot
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d your-domain.com

# Update nginx.conf for SSL
# Mount certificates as volumes
```

### 3. Enable Firewall

```bash
# Allow only HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Monitor Container Health

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' data-deployer

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' data-deployer
```

### 5. Setup Log Rotation

Create `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

---

## 📊 Monitoring

### Resource Usage

```bash
# Container stats
docker stats data-deployer

# Detailed inspect
docker inspect data-deployer
```

### Application Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Since 1 hour ago
docker-compose logs --since 1h
```

### Nginx Access Logs

```bash
docker exec data-deployer tail -f /var/log/nginx/access.log
```

### Node.js Logs

```bash
docker exec data-deployer tail -f /var/log/supervisor/nodejs-stdout.log
```

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Check if port 80 is already in use
sudo lsof -i :80

# Try running on different port
docker-compose down
# Edit docker-compose.yml: ports: "8080:80"
docker-compose up -d
```

### Node.js Process Crashed

```bash
# Check supervisor logs
docker exec data-deployer cat /var/log/supervisor/nodejs-stderr.log

# Restart just Node.js
docker exec data-deployer supervisorctl restart nodejs
```

### Nginx Issues

```bash
# Test nginx config
docker exec data-deployer nginx -t

# Restart nginx
docker exec data-deployer supervisorctl restart nginx

# Check nginx error log
docker exec data-deployer cat /var/log/nginx/error.log
```

### CORS Errors

```bash
# Verify CORS headers
curl -I http://localhost

# Should see:
# Access-Control-Allow-Origin: *
```

### Container Health Check Failing

```bash
# Check health status
docker inspect --format='{{json .State.Health}}' data-deployer

# Manually test health endpoint
docker exec data-deployer curl -f http://localhost/health
```

### Cannot Connect from Frontend

```bash
# Check if container is running
docker ps | grep data-deployer

# Check if port is accessible
curl http://YOUR_SERVER_IP

# Check firewall rules
sudo ufw status
```

---

## 🔍 Advanced Configuration

### Custom Port

Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Run on port 8080 instead
```

### Add More Environment Variables

Edit `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - PORT=3002
  - AWS_REGION=us-east-1
  - LOG_LEVEL=info
```

### Mount Additional Volumes

Edit `docker-compose.yml`:
```yaml
volumes:
  - ./data/uploads:/app/server/uploads
  - ./data/deployments:/app/server/deployments
  - ./custom-config.json:/app/server/config.json
```

### Resource Limits

Edit `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

---

## 📈 Scaling (Optional)

### Run Multiple Containers

```bash
docker-compose up -d --scale data-deployer=3
```

### Use Load Balancer (Nginx)

Create `nginx-lb.conf` for load balancing multiple containers.

---

## 🎉 Benefits Over Manual Deployment

| Feature | Manual Deployment | Docker Deployment |
|---------|------------------|-------------------|
| Setup Time | 30+ minutes | 3 minutes |
| Portability | OS-dependent | Works anywhere |
| Updates | Manual steps | `docker-compose up -d` |
| Rollback | Complex | `docker-compose down && up` |
| Isolation | System-wide | Containerized |
| Consistency | Varies | Identical everywhere |

---

## 💡 Tips

1. **Always use docker-compose** for easier management
2. **Don't expose port 3002** - only port 80 should be public
3. **Use volumes** for persistent data
4. **Enable auto-restart** with `restart: unless-stopped`
5. **Monitor logs** regularly with `docker-compose logs`
6. **Backup data directory** before major updates
7. **Use health checks** to ensure service reliability

---

## 📞 Support

### View Container Status
```bash
docker-compose ps
docker-compose logs
```

### Debug Inside Container
```bash
docker exec -it data-deployer sh
cd /app/server
ls -la
```

### Get Help
```bash
docker-compose --help
docker --help
```

---

## 🔗 Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Docker Documentation](https://hub.docker.com/_/nginx)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

## 🎊 Success!

Your Data Deployer is now:
- ✅ Running in a Docker container
- ✅ Accessible on port 80
- ✅ Auto-restarting on failure
- ✅ Health-checked every 30 seconds
- ✅ Deployable anywhere Docker runs
- ✅ Easy to update and maintain

Test it: `curl http://localhost`
