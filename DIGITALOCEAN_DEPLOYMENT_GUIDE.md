# 🚀 Data Deployer - DigitalOcean Deployment Guide

Complete step-by-step guide to deploy the Data Deployer Node.js backend server on DigitalOcean.

---

## 📋 Prerequisites

- DigitalOcean account
- Local machine with SSH access
- Basic knowledge of Linux commands
- GitHub repository with your code

---

## 🎯 Architecture Overview

```
Frontend (Vercel) → Internet → DigitalOcean Droplet → Nginx (Port 80) → Node.js Server (Port 3002)
```

---

## 📦 Step 1: Create DigitalOcean Droplet

1. **Log in to DigitalOcean Dashboard**
   - Visit: https://cloud.digitalocean.com/

2. **Create New Droplet**
   - Click **"Create"** → **"Droplets"**
   
3. **Choose Configuration**
   - **Image**: Ubuntu 25.04 (LTS) x64
   - **Plan**: Basic
   - **CPU Options**: Regular (Shared CPU)
   - **Size**: 
     - Minimum: **$4/month** (512MB RAM, 1 vCPU, 10GB SSD)
     - Recommended: **$6/month** (1GB RAM, 1 vCPU, 25GB SSD)
   - **Datacenter Region**: Choose closest to your users (e.g., Bangalore for India)
   
4. **Authentication**
   - Select **Password** or **SSH Keys** (SSH keys recommended for security)
   
5. **Finalize and Create**
   - Give your droplet a hostname (e.g., `data-deployer-prod`)
   - Click **"Create Droplet"**
   
6. **Note Your Droplet IP**
   - Copy the public IPv4 address (e.g., `134.209.148.250`)

---

## 🔐 Step 2: Initial Server Setup

### 2.1 Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

**Example:**
```bash
ssh root@134.209.148.250
```

### 2.2 Update System Packages

```bash
apt update && apt upgrade -y
```

### 2.3 Install Node.js 18.x

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

Verify installation:
```bash
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 2.4 Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### 2.5 Install Nginx (Reverse Proxy)

```bash
apt install -y nginx
```

### 2.6 Install Git

```bash
apt install -y git
```

---

## 📁 Step 3: Deploy Application Files

### 3.1 Create Application Directory

```bash
mkdir -p /var/www/data-deployer
cd /var/www/data-deployer
```

### 3.2 Create Server Directory Structure

```bash
mkdir -p server/uploads
mkdir -p server/deployments/modules
mkdir -p server/logs
```

### 3.3 Copy Server Files from Local Machine

On your **local machine**, from the project root:

```bash
# Copy all server files to the droplet
scp -r server/* root@YOUR_DROPLET_IP:/var/www/data-deployer/server/
```

**Example:**
```bash
scp -r server/* root@134.209.148.250:/var/www/data-deployer/server/
```

---

## 📦 Step 4: Install Node.js Dependencies

Back on the **droplet**:

```bash
cd /var/www/data-deployer/server

# Install dependencies
npm install
```

**Expected packages:**
- express
- cors
- body-parser
- aws-sdk
- snowflake-sdk
- multer
- And other dependencies from package.json

---

## 🔧 Step 5: Configure Nginx as Reverse Proxy

### 5.1 Create Nginx Configuration

```bash
cat > /etc/nginx/sites-available/data-deployer << 'EOF'
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    # Increase timeouts and size limits for large file uploads (Docker images)
    client_max_body_size 2G;
    client_body_timeout 300s;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        # CORS headers for cross-origin requests
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        add_header 'Access-Control-Max-Age' '3600' always;

        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }

        # Proxy to Node.js server
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

**Important:** Replace `YOUR_DROPLET_IP` with your actual IP address.

### 5.2 Enable the Site

```bash
# Remove default Nginx config
rm /etc/nginx/sites-enabled/default

# Enable data-deployer site
ln -s /etc/nginx/sites-available/data-deployer /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5.3 Restart Nginx

```bash
systemctl restart nginx
systemctl enable nginx
```

---

## 🚦 Step 6: Configure Firewall

```bash
# Allow SSH (important - don't lock yourself out!)
ufw allow OpenSSH

# Allow HTTP traffic
ufw allow 'Nginx Full'

# Enable firewall
ufw --force enable

# Check status
ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
```

---

## 🎬 Step 7: Start Node.js Server with PM2

### 7.1 Disable CORS in server.js (Nginx handles it)

```bash
cd /var/www/data-deployer/server
nano server.js
```

Find the line (around line 33):
```javascript
app.use(cors());
```

Comment it out:
```javascript
// app.use(cors());
```

Save and exit (Ctrl+X, Y, Enter).

### 7.2 Start Server with PM2

```bash
cd /var/www/data-deployer/server
pm2 start server.js --name data-deployer-server
```

### 7.3 Configure PM2 to Start on Boot

```bash
pm2 startup
pm2 save
```

### 7.4 Check Server Status

```bash
pm2 status
pm2 logs data-deployer-server
```

Expected output:
```
┌────┬─────────────────────┬─────────┬─────────┬──────────┐
│ id │ name                │ mode    │ status  │ memory   │
├────┼─────────────────────┼─────────┼─────────┼──────────┤
│ 0  │ data-deployer-serve │ fork    │ online  │ 50.2mb   │
└────┴─────────────────────┴─────────┴─────────┴──────────┘
```

---

## ✅ Step 8: Verify Deployment

### 8.1 Test from Droplet

```bash
curl http://localhost:3002
```

Expected: Response from Express server (may be 404, that's OK)

### 8.2 Test through Nginx

```bash
curl -I http://YOUR_DROPLET_IP
```

Check for these headers:
```
HTTP/1.1 404 Not Found
Server: nginx/1.26.3
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### 8.3 Test from External Machine

From your **local machine**:

```bash
curl http://YOUR_DROPLET_IP
```

Should receive the same response as above.

---

## 🔄 Step 9: Update Frontend to Use DigitalOcean Server

### 9.1 Update API Endpoints

In your frontend code, update all API calls from `localhost:3002` to your droplet IP:

**Before:**
```javascript
fetch('http://localhost:3002/api/test-aws', {
```

**After:**
```javascript
fetch('http://YOUR_DROPLET_IP/api/test-aws', {
```

### 9.2 Files to Update

Update these files in your frontend:
- `src/components/ConfigurationStep.tsx`
- `src/components/ViewValidations.tsx`
- `src/components/ValidationStep.tsx`
- `src/components/ActivityLog.tsx`
- `src/components/DeploymentStep.tsx`
- `src/components/DeploymentWizard.tsx`
- `src/components/ProgressStep.tsx`

### 9.3 Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "Update API endpoints to use DigitalOcean server"

# Push to GitHub (Vercel will auto-deploy)
git push origin main
```

---

## 🛠️ Useful PM2 Commands

```bash
# View logs
pm2 logs data-deployer-server

# Restart server
pm2 restart data-deployer-server

# Stop server
pm2 stop data-deployer-server

# Delete process
pm2 delete data-deployer-server

# Monitor server
pm2 monit

# View detailed info
pm2 show data-deployer-server
```

---

## 🔍 Troubleshooting

### Server Not Starting

```bash
# Check PM2 logs
pm2 logs data-deployer-server --lines 100

# Check if port 3002 is in use
netstat -tulpn | grep 3002

# Restart server
pm2 restart data-deployer-server
```

### Nginx Issues

```bash
# Test configuration
nginx -t

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### CORS Errors

Make sure:
1. `app.use(cors())` is commented out in `server.js`
2. Nginx config has CORS headers
3. PM2 server is restarted after changes

```bash
# Restart server after changes
pm2 restart data-deployer-server
```

### Cannot Connect from Frontend

```bash
# Check if server is running
pm2 status

# Check if Nginx is running
systemctl status nginx

# Check firewall rules
ufw status

# Test endpoint directly
curl -v http://YOUR_DROPLET_IP/api/test-aws
```

---

## 🔒 Security Best Practices

### 1. Change Root Password

```bash
passwd
```

### 2. Create Non-Root User (Recommended)

```bash
adduser deploy
usermod -aG sudo deploy
```

### 3. Setup SSH Key Authentication

```bash
# On local machine
ssh-copy-id root@YOUR_DROPLET_IP
```

### 4. Disable Password Authentication (Optional)

Edit SSH config:
```bash
nano /etc/ssh/sshd_config
```

Set:
```
PasswordAuthentication no
```

Restart SSH:
```bash
systemctl restart sshd
```

### 5. Setup SSL with Let's Encrypt (Recommended for Production)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d your-domain.com

# Auto-renewal test
certbot renew --dry-run
```

---

## 📊 Monitoring & Maintenance

### Check Server Resources

```bash
# CPU and Memory usage
htop

# Disk usage
df -h

# PM2 monitoring
pm2 monit
```

### Update Application

```bash
cd /var/www/data-deployer/server

# Pull latest code (if using Git)
git pull origin main

# Install new dependencies
npm install

# Restart server
pm2 restart data-deployer-server
```

---

## 🎉 Success!

Your Data Deployer backend is now:
- ✅ Running on DigitalOcean
- ✅ Managed by PM2 for reliability
- ✅ Served through Nginx with CORS support
- ✅ Protected by firewall
- ✅ Auto-restarts on server reboot
- ✅ Accessible from your Vercel frontend

---

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs data-deployer-server`
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Verify all endpoints are updated in frontend
4. Test directly: `curl -v http://YOUR_DROPLET_IP/api/test-aws`

---

## 🔗 Useful Resources

- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
