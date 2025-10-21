# AWS EC2 Production Deployment Guide

Complete step-by-step guide to deploy Data Deployer backend on AWS EC2 with Docker.

## 📋 Prerequisites

- AWS account with EC2 and IAM permissions
- Domain name (optional, for custom domain)
- Local machine with SSH client
- AWS CLI installed (optional)

---

## 🚀 Step 1: Create EC2 Instance

### 1.1 Launch EC2 Instance
```bash
# Via AWS Console:
# 1. Go to EC2 Dashboard → Launch Instance
# 2. Choose Ubuntu Server 22.04 LTS (Free Tier eligible)
# 3. Instance type: t2.micro (1GB RAM) or t3.small (2GB RAM)
# 4. Create new key pair or use existing
# 5. Security Group: Allow SSH (22), HTTP (80), HTTPS (443)
# 6. Storage: 20GB gp3 (minimum)
# 7. Launch instance
```

### 1.2 Configure Security Group
```bash
# In AWS Console → EC2 → Security Groups
# Add these inbound rules:
Type        Protocol    Port Range    Source
SSH         TCP         22           0.0.0.0/0
HTTP        TCP         80           0.0.0.0/0
HTTPS       TCP         443          0.0.0.0/0
Custom TCP  TCP         3002         127.0.0.1/32 (localhost only)
```

### 1.3 Connect to Instance
```bash
# Download your key pair (e.g., my-key.pem)
chmod 400 my-key.pem

# Connect via SSH
ssh -i my-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 🔧 Step 2: Initial Server Setup

### 2.1 Update System
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y git curl wget unzip docker.io docker-compose-v2 htop

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Logout and login again for group changes
exit
ssh -i my-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 2.2 Configure Swap (Important for t2.micro)
```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap
free -h
```

---

## 🔧 Step 3: Install and Setup Application

### 3.1 Clone Repository
```bash
# Clone your repository
git clone https://github.com/ashis001/minibeast.git
cd minibeast

# Verify files exist
ls -la
# Should see: Dockerfile, docker-compose.yml, server/, src/
```

### 3.2 **CRITICAL: Fix Container Permissions**
```bash
# Create data directories with correct permissions
mkdir -p data/uploads data/deployments data/logs

# Set proper permissions (IMPORTANT!)
chmod -R 777 data/uploads data/deployments
sudo chown -R ubuntu:ubuntu data/

# Verify permissions
ls -la data/
# Should show: drwxrwxrwx for uploads and deployments
```

### 3.3 Configure Environment
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
AWS_DEFAULT_REGION=us-east-1
NODE_ENV=production
PORT=3002
```

---

## 🐳 Step 4: Deploy with Docker

### 4.1 Build and Start Container
```bash
# Build without cache to ensure fresh build
docker compose build --no-cache

# Start the application
docker compose up -d

# Verify container is running
docker compose ps
# Should show: data-deployer running on 0.0.0.0:80->80/tcp
```

### 4.2 **Fix Common Container Issues**

#### Issue 1: Permission Denied Errors
```bash
# If you see EACCES errors in logs:
docker compose down

# Fix host permissions
chmod -R 777 data/uploads data/deployments
sudo chown -R ubuntu:ubuntu data/

# Restart container
docker compose up -d
```

#### Issue 2: Container Override Problems
```bash
# If container won't start or keeps restarting:
docker compose down
docker system prune -f
docker volume prune -f
docker compose build --no-cache
docker compose up -d
```

#### Issue 3: Memory Issues (t2.micro)
```bash
# Monitor memory usage
free -h
docker stats

# If container gets killed (OOMKilled):
# 1. Ensure swap is enabled (see Step 2.2)
# 2. Consider upgrading to t3.small
# 3. Reduce Docker build concurrency:
export DOCKER_BUILDKIT=0
docker compose build --no-cache
```

#### Issue 4: Port Conflicts
```bash
# Check what's using port 80
sudo netstat -tulpn | grep :80

# Kill conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx
sudo systemctl disable apache2
sudo systemctl disable nginx

# Restart your container
docker compose up -d
```

### 4.3 Verify Deployment
```bash
# Check container logs
docker compose logs -f

# Test local API
curl http://localhost/health
# Should return: {"status":"ok"}

# Test from outside
curl http://YOUR_EC2_PUBLIC_IP/health

# Check container permissions inside
docker exec data-deployer ls -la /app/server/
# uploads should show: drwxrwxrwx
```

---

## 🌐 Step 5: Setup HTTPS Access

### 5.1 Option A: Cloudflare Tunnel (Recommended)
```bash
# Download cloudflared for Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Start tunnel (temporary)
cloudflared tunnel --url http://localhost:80
# Copy the HTTPS URL (e.g., https://abc-def.trycloudflare.com)
```

### 5.2 Option B: Application Load Balancer + ACM
```bash
# Via AWS Console:
# 1. Create Application Load Balancer
# 2. Add EC2 instance as target
# 3. Request SSL certificate via ACM
# 4. Configure HTTPS listener
# 5. Update DNS to point to ALB
```

### 5.3 Option C: Nginx + Let's Encrypt
```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/data-deployer
```

Add Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site and get SSL certificate
sudo ln -s /etc/nginx/sites-available/data-deployer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 Step 6: AWS-Specific Optimizations

### 6.1 IAM Role for EC2 (Recommended)
```bash
# Instead of hardcoding AWS credentials:
# 1. Create IAM role with required permissions
# 2. Attach role to EC2 instance
# 3. Remove AWS credentials from .env file
```

### 6.2 CloudWatch Monitoring
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure monitoring
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 6.3 Elastic IP (Optional)
```bash
# In AWS Console:
# 1. Allocate Elastic IP
# 2. Associate with your EC2 instance
# 3. Update DNS records to use Elastic IP
```

---

## 🔧 Step 7: Troubleshooting Common Issues

### 7.1 Container Won't Start
```bash
# Check Docker daemon
sudo systemctl status docker

# Check available memory
free -h
df -h

# Check compose file syntax
docker compose config

# View detailed logs
docker compose logs --tail=100
```

### 7.2 Permission Errors
```bash
# Fix upload permissions
docker exec data-deployer chmod -R 777 /app/server/uploads
docker exec data-deployer chmod -R 777 /app/server/deployments

# Or recreate with correct permissions
docker compose down
sudo rm -rf data/
mkdir -p data/uploads data/deployments data/logs
chmod -R 777 data/uploads data/deployments
sudo chown -R ubuntu:ubuntu data/
docker compose up -d
```

### 7.3 Memory/Performance Issues
```bash
# Monitor resources
htop
docker stats
iostat -x 1

# Check swap usage
swapon --show

# If consistently running out of memory:
# Upgrade to t3.small or t3.medium instance type
```

### 7.4 Network/Security Issues
```bash
# Check security group rules in AWS Console
# Ensure ports 80, 443, 22 are open

# Test connectivity
curl -I http://YOUR_EC2_PUBLIC_IP/health
telnet YOUR_EC2_PUBLIC_IP 80

# Check local firewall (usually disabled on Ubuntu)
sudo ufw status
```

### 7.5 AWS Service Limits
```bash
# If deployment fails due to AWS limits:
# 1. Check Service Quotas in AWS Console
# 2. Request limit increases if needed
# 3. Use different regions if current region is constrained
```

---

## 🔄 Step 8: Updates and Maintenance

### 8.1 Update Application
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

### 8.2 Automated Backups
```bash
# Create backup script
nano ~/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cd ~/minibeast
tar -czf ~/backups/backup_$DATE.tar.gz data/
aws s3 cp ~/backups/backup_$DATE.tar.gz s3://your-backup-bucket/
find ~/backups/ -name "backup_*.tar.gz" -mtime +7 -delete
```

```bash
# Make executable and schedule
chmod +x ~/backup.sh
mkdir -p ~/backups
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

### 8.3 Monitor Logs
```bash
# Real-time logs
docker compose logs -f

# Specific service logs
docker exec data-deployer tail -f /var/log/supervisor/nodejs-stdout.log
docker exec data-deployer tail -f /var/log/supervisor/nginx-access.log

# System logs
sudo journalctl -u docker -f
```

---

## ✅ Step 9: Verification Checklist

- [ ] EC2 instance created and accessible via SSH
- [ ] Security group configured (ports 80, 443, 22)
- [ ] Swap configured (especially for t2.micro)
- [ ] Docker and docker-compose installed
- [ ] Repository cloned and configured
- [ ] **Data directories created with 777 permissions**
- [ ] Environment variables configured
- [ ] Container built and running
- [ ] **No EACCES permission errors in logs**
- [ ] API responding at http://PUBLIC_IP/health
- [ ] HTTPS access configured (Cloudflare/ALB/Nginx)
- [ ] Frontend can connect to backend API
- [ ] AWS deployment functionality working
- [ ] CloudWatch monitoring configured (optional)
- [ ] Automated backups configured (optional)

---

## 🆘 Emergency Recovery

If everything breaks:
```bash
# Complete reset
docker compose down
docker system prune -af
docker volume prune -af
sudo rm -rf data/
git reset --hard origin/main
mkdir -p data/uploads data/deployments data/logs
chmod -R 777 data/uploads data/deployments
sudo chown -R ubuntu:ubuntu data/
docker compose build --no-cache
docker compose up -d
```

---

## 💰 Cost Optimization

### Free Tier Usage:
- **t2.micro**: 750 hours/month free
- **EBS**: 30GB free
- **Data Transfer**: 1GB/month free

### Beyond Free Tier:
- **t3.small**: ~$15/month (recommended for production)
- **t3.medium**: ~$30/month (high traffic)
- **Elastic IP**: Free when attached, $0.005/hour when unattached
- **ALB**: ~$16/month + $0.008/LCU-hour

---

## 📞 Support

- Check logs: `docker compose logs -f`
- Verify permissions: `ls -la data/`
- Test API: `curl http://PUBLIC_IP/health`
- Monitor resources: `htop` or `docker stats`
- AWS Console: CloudWatch, EC2 Dashboard

**Common URLs:**
- Health Check: `http://YOUR_EC2_PUBLIC_IP/health`
- API Base: `http://YOUR_EC2_PUBLIC_IP/api/`
- HTTPS via ALB: `https://your-domain.com`
- HTTPS via Tunnel: `https://your-tunnel-url.trycloudflare.com`
