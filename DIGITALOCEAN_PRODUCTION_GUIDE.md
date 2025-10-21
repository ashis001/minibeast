# DigitalOcean Production Deployment Guide

Complete step-by-step guide to deploy Data Deployer backend on DigitalOcean with Docker.

## 📋 Prerequisites

- DigitalOcean account
- Domain name (optional, for custom domain)
- AWS account with admin permissions
- Local machine with SSH client

---

## 🚀 Step 1: Create DigitalOcean Droplet

### 1.1 Create Droplet
```bash
# Via DigitalOcean Dashboard:
# - Choose Ubuntu 22.04 LTS
# - Basic plan: $6/month (1GB RAM, 1 vCPU, 25GB SSD)
# - Add SSH key for secure access
# - Choose datacenter region closest to users
```

### 1.2 Initial Server Setup
```bash
# Connect to your droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y git curl wget unzip docker.io docker-compose-v2

# Start Docker service
systemctl start docker
systemctl enable docker

# Add user to docker group (optional)
usermod -aG docker root
```

---

## 🔧 Step 2: Install and Setup Application

### 2.1 Clone Repository
```bash
# Clone your repository
git clone https://github.com/ashis001/minibeast.git
cd minibeast

# Verify files exist
ls -la
# Should see: Dockerfile, docker-compose.yml, server/, src/
```

### 2.2 **CRITICAL: Fix Container Permissions**
```bash
# Create data directories with correct permissions
mkdir -p data/uploads data/deployments data/logs

# Set proper permissions (IMPORTANT!)
chmod -R 777 data/uploads data/deployments
chown -R root:root data/

# Verify permissions
ls -la data/
# Should show: drwxrwxrwx for uploads and deployments
```

### 2.3 Configure Environment
```bash
# Copy environment template
cp server/.env.example server/.env

# Edit environment variables
nano server/.env
```

Add your AWS credentials:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=ap-south-1
NODE_ENV=production
PORT=3002
```

---

## 🐳 Step 3: Deploy with Docker

### 3.1 Build and Start Container
```bash
# Build without cache to ensure fresh build
docker compose build --no-cache

# Start the application
docker compose up -d

# Verify container is running
docker compose ps
# Should show: data-deployer running on 0.0.0.0:80->80/tcp
```

### 3.2 **Fix Common Container Issues**

#### Issue 1: Permission Denied Errors
```bash
# If you see EACCES errors in logs:
docker compose down

# Fix host permissions
chmod -R 777 data/uploads data/deployments

# Restart container
docker compose up -d
```

#### Issue 2: Container Override Problems
```bash
# If container won't start or keeps restarting:
docker compose down
docker system prune -f
docker compose build --no-cache
docker compose up -d
```

#### Issue 3: Port Already in Use
```bash
# Check what's using port 80
sudo netstat -tulpn | grep :80

# Kill conflicting process if needed
sudo systemctl stop apache2  # or nginx
sudo systemctl disable apache2

# Restart your container
docker compose up -d
```

### 3.3 Verify Deployment
```bash
# Check container logs
docker compose logs -f

# Test local API
curl http://localhost/health
# Should return: {"status":"ok"}

# Check container permissions inside
docker exec data-deployer ls -la /app/server/
# uploads should show: drwxrwxrwx
```

---

## 🌐 Step 4: Setup HTTPS Access

### 4.1 Install Cloudflare Tunnel
```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb

# Start tunnel (temporary)
cloudflared tunnel --url http://localhost:80
# Copy the HTTPS URL (e.g., https://abc-def.trycloudflare.com)
```

### 4.2 Make Tunnel Permanent (Optional)
```bash
# Login to Cloudflare
cloudflared tunnel login

# Create named tunnel
cloudflared tunnel create data-deployer

# Configure tunnel
nano ~/.cloudflared/config.yml
```

Add configuration:
```yaml
tunnel: data-deployer
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:80
  - service: http_status:404
```

```bash
# Install as service
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

---

## 🔧 Step 5: Troubleshooting Common Issues

### 5.1 Container Won't Start
```bash
# Check Docker daemon
systemctl status docker

# Check compose file syntax
docker compose config

# View detailed logs
docker compose logs --tail=100
```

### 5.2 Permission Errors
```bash
# Fix upload permissions
docker exec data-deployer chmod -R 777 /app/server/uploads
docker exec data-deployer chmod -R 777 /app/server/deployments

# Or recreate with correct permissions
docker compose down
rm -rf data/
mkdir -p data/uploads data/deployments data/logs
chmod -R 777 data/uploads data/deployments
docker compose up -d
```

### 5.3 Memory Issues
```bash
# Check memory usage
free -h
docker stats

# If low memory, upgrade droplet or add swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 5.4 Network Issues
```bash
# Check firewall
ufw status
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp

# Check DigitalOcean firewall in dashboard
# Ensure HTTP (80) and HTTPS (443) are allowed
```

---

## 🔄 Step 6: Updates and Maintenance

### 6.1 Update Application
```bash
cd ~/minibeast

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# Verify update
docker compose logs -f
```

### 6.2 Backup Data
```bash
# Backup deployment data
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Copy to local machine
scp root@YOUR_DROPLET_IP:~/minibeast/backup-*.tar.gz ./
```

### 6.3 Monitor Logs
```bash
# Real-time logs
docker compose logs -f

# Specific service logs
docker exec data-deployer tail -f /var/log/supervisor/nodejs-stdout.log
docker exec data-deployer tail -f /var/log/supervisor/nodejs-stderr.log
```

---

## ✅ Step 7: Verification Checklist

- [ ] Droplet created and accessible via SSH
- [ ] Docker and docker-compose installed
- [ ] Repository cloned and configured
- [ ] **Data directories created with 777 permissions**
- [ ] Environment variables configured
- [ ] Container built and running
- [ ] **No EACCES permission errors in logs**
- [ ] API responding at http://localhost/health
- [ ] Cloudflare tunnel providing HTTPS access
- [ ] Frontend can connect to backend API
- [ ] AWS deployment functionality working

---

## 🆘 Emergency Recovery

If everything breaks:
```bash
# Complete reset
docker compose down
docker system prune -af
rm -rf data/
git reset --hard origin/main
mkdir -p data/uploads data/deployments data/logs
chmod -R 777 data/uploads data/deployments
docker compose build --no-cache
docker compose up -d
```

---

## 📞 Support

- Check logs: `docker compose logs -f`
- Verify permissions: `ls -la data/`
- Test API: `curl http://localhost/health`
- Monitor resources: `htop` or `docker stats`

**Common URLs:**
- Health Check: `http://YOUR_DROPLET_IP/health`
- API Base: `http://YOUR_DROPLET_IP/api/`
- HTTPS via Tunnel: `https://your-tunnel-url.trycloudflare.com`
