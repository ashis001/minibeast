# 🚀 Complete Deployment Guide - Frontend + Backend

This guide covers deploying the complete Data Deployer application with React frontend on Vercel and Dockerized Node.js backend on any cloud provider.

---

## 🎯 Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     INTERNET                              │
└────────────┬─────────────────────────┬───────────────────┘
             │                         │
             ▼                         ▼
    ┌────────────────┐        ┌──────────────────┐
    │   FRONTEND     │        │     BACKEND      │
    │   (Vercel)     │───────▶│   (Docker)       │
    │   React App    │        │   Nginx + Node   │
    └────────────────┘        └──────────────────┘
    Auto-deployed from         Any VPS with Docker
    GitHub (main branch)       (DigitalOcean/AWS/GCP)
```

---

## 📋 Prerequisites

- **GitHub Account** - For code repository
- **Vercel Account** - For frontend hosting (free tier available)
- **Cloud Provider Account** - For backend (DigitalOcean, AWS, GCP, etc.)
- **Domain** (Optional) - Custom domain for production

---

## Part 1: Deploy Backend (Docker)

### Option A: DigitalOcean Droplet (Recommended for Beginners)

#### Step 1: Create Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com/)
2. Click **Create** → **Droplets**
3. Choose configuration:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic - $6/month (1GB RAM, 1 vCPU)
   - **Datacenter**: Closest to your users
4. **Authentication**: SSH Key (recommended) or Password
5. Click **Create Droplet**
6. **Note your Droplet IP**: e.g., `134.209.148.250`

#### Step 2: Install Docker on Droplet

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Install Docker
curl -fsSL https://get.docker.com | sh

# Verify installation
docker --version
docker compose version
```

#### Step 3: Deploy Backend

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Start Docker container
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

#### Step 4: Configure Firewall

```bash
# Allow HTTP traffic
ufw allow 80/tcp

# Allow HTTPS (if using SSL)
ufw allow 443/tcp

# Enable firewall
ufw enable

# Verify
ufw status
```

#### Step 5: Test Backend

```bash
# From droplet
curl http://localhost

# From your local machine
curl http://YOUR_DROPLET_IP
```

Expected: You should see CORS headers and response from the API.

---

### Option B: AWS EC2

#### Step 1: Launch EC2 Instance

1. Open AWS Console → EC2
2. Click **Launch Instance**
3. Choose:
   - **AMI**: Ubuntu 22.04 LTS
   - **Instance Type**: t2.micro (free tier) or t2.small
   - **Key Pair**: Create/select SSH key
4. **Security Group**: Allow ports 22 (SSH) and 80 (HTTP)
5. Launch instance
6. **Note Public IP**

#### Step 2: Install Docker

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
exit

# SSH again (for docker group to take effect)
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

#### Step 3: Deploy

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
docker-compose up -d
```

---

### Option C: Google Cloud Platform (GCP)

#### Step 1: Create VM Instance

1. Go to [GCP Console](https://console.cloud.google.com/)
2. **Compute Engine** → **VM Instances** → **Create Instance**
3. Configure:
   - **Machine type**: e2-micro (free tier) or e2-small
   - **Boot disk**: Ubuntu 22.04 LTS
   - **Firewall**: Allow HTTP traffic
4. Create instance

#### Step 2: Install Docker

```bash
# SSH via browser or gcloud CLI
gcloud compute ssh YOUR_INSTANCE_NAME

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit

# SSH again
gcloud compute ssh YOUR_INSTANCE_NAME
```

#### Step 3: Deploy

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
docker-compose up -d
```

---

## Part 2: Deploy Frontend (Vercel)

### Step 1: Update API Endpoints in Code

**Before deploying frontend**, update all API endpoints to use your backend server IP.

Update these files with your `BACKEND_IP`:

```javascript
// Replace in all these files:
// - src/components/ConfigurationStep.tsx
// - src/components/ViewValidations.tsx
// - src/components/ValidationStep.tsx
// - src/components/ActivityLog.tsx
// - src/components/DeploymentStep.tsx
// - src/components/DeploymentWizard.tsx
// - src/components/ProgressStep.tsx

// Change from:
fetch('http://localhost:3002/api/...')

// To:
fetch('http://YOUR_DROPLET_IP/api/...')
// Example: fetch('http://134.209.148.250/api/...')
```

### Step 2: Commit Changes

```bash
git add .
git commit -m "Update API endpoints to production backend"
git push origin main
```

### Step 3: Deploy to Vercel

#### Option A: Using Vercel Dashboard (Easiest)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. **Import Git Repository**
4. Select your GitHub repository
5. **Configure**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. Click **Deploy**
7. Wait 2-3 minutes
8. **Your app is live!** Copy the URL (e.g., `https://your-app.vercel.app`)

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /path/to/your/project
vercel --prod

# Follow prompts
```

---

## Part 3: Verify Complete Deployment

### Test Backend Directly

```bash
# Test health endpoint
curl http://YOUR_BACKEND_IP/health

# Test with CORS headers
curl -I http://YOUR_BACKEND_IP
```

Expected headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Test Frontend

1. Open your Vercel URL in browser
2. Navigate to **Configuration** page
3. Enter AWS credentials and click **Test AWS Connection**
4. Enter Snowflake credentials and click **Test Snowflake Connection**

**Expected**: Connections should succeed and show green checkmarks.

---

## Part 4: Production Best Practices

### 1. Enable HTTPS for Backend (SSL Certificate)

#### Using Let's Encrypt (Free SSL)

```bash
# SSH into your server
ssh root@YOUR_BACKEND_IP

# Install Certbot
apt install -y certbot

# Get SSL certificate (requires domain)
certbot certonly --standalone -d your-domain.com

# Update Nginx config for SSL
# (See DOCKER_DEPLOYMENT_GUIDE.md for details)

# Restart container
docker-compose restart
```

### 2. Use Environment Variables

Create `.env` file for backend:

```bash
# On your server
cd /path/to/your-repo
cat > .env << EOF
NODE_ENV=production
PORT=3002
AWS_REGION=us-east-1
LOG_LEVEL=info
EOF
```

Update `docker-compose.yml`:
```yaml
services:
  data-deployer:
    env_file:
      - .env
```

### 3. Setup Custom Domain

#### For Frontend (Vercel):
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel

#### For Backend:
1. Point A record of your domain to your server IP
2. Update Nginx config with your domain
3. Get SSL certificate for the domain

### 4. Enable Monitoring

#### Backend Monitoring:

```bash
# Install monitoring tools
docker stats data-deployer

# Setup log rotation
# (See DOCKER_DEPLOYMENT_GUIDE.md)

# Enable health checks
docker inspect --format='{{.State.Health.Status}}' data-deployer
```

#### Frontend Monitoring:
- Use Vercel Analytics (built-in)
- Monitor performance metrics
- Track errors with error boundary

---

## Part 5: Automated Deployment (CI/CD)

### Setup Auto-Deployment

#### Frontend (Vercel):
✅ **Already automatic!** Vercel auto-deploys on every push to `main` branch.

#### Backend (Docker):

Create deployment script on your server:

```bash
# On server: /root/update-backend.sh
#!/bin/bash
cd /path/to/your-repo
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo "Backend updated successfully!"
```

Make it executable:
```bash
chmod +x /root/update-backend.sh
```

Run when you want to update:
```bash
/root/update-backend.sh
```

### GitHub Actions (Advanced)

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /root/data-deployer-main
            git pull
            docker-compose down
            docker-compose up -d --build
```

---

## Part 6: Updates and Maintenance

### Update Frontend

```bash
# Make code changes
git add .
git commit -m "Update frontend"
git push origin main

# Vercel automatically deploys!
```

### Update Backend

```bash
# SSH into server
ssh root@YOUR_BACKEND_IP

# Pull latest code
cd /path/to/your-repo
git pull origin main

# Restart containers
docker-compose down
docker-compose up -d --build

# Verify
docker-compose ps
docker-compose logs -f
```

### Rollback (if needed)

#### Frontend:
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click **⋯** → **Promote to Production**

#### Backend:
```bash
# Checkout previous commit
git log --oneline  # Find previous commit hash
git checkout <commit-hash>

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

---

## Part 7: Cost Estimation

### Monthly Costs (USD)

| Component | Provider | Plan | Cost |
|-----------|----------|------|------|
| Frontend | Vercel | Hobby (Free) | $0 |
| Backend | DigitalOcean | Basic Droplet (1GB) | $6 |
| Domain | Namecheap | .com domain | $12/year |
| SSL | Let's Encrypt | Free | $0 |
| **Total** | | | **~$6-7/month** |

### Scaling Options

As your app grows:

| Users | Frontend | Backend | Cost |
|-------|----------|---------|------|
| 0-10K | Vercel Free | $6 Droplet | $6/mo |
| 10K-50K | Vercel Free | $12 Droplet | $12/mo |
| 50K-100K | Vercel Pro ($20) | $24 Droplet | $44/mo |
| 100K+ | Vercel Pro | Multiple droplets + Load Balancer | $100+/mo |

---

## Part 8: Troubleshooting

### Frontend Can't Connect to Backend

**Check 1: CORS Headers**
```bash
curl -I http://YOUR_BACKEND_IP
```
Should see `Access-Control-Allow-Origin: *`

**Check 2: Backend is Running**
```bash
ssh root@YOUR_BACKEND_IP
docker-compose ps
```

**Check 3: Firewall**
```bash
ufw status
# Should show port 80 ALLOWED
```

**Check 4: Frontend API URLs**
Check browser console for correct backend IP in fetch calls.

### Backend Container Keeps Restarting

```bash
# Check logs
docker-compose logs -f

# Common issues:
# - Port 80 already in use
# - Nginx config syntax error
# - Node.js process crashing

# Fix: Check logs and restart
docker-compose down
docker-compose up -d
```

### Deployment Failed on Vercel

**Common causes:**
- Build errors (check Vercel logs)
- Wrong build command
- Missing environment variables

**Fix:**
1. Check Vercel deployment logs
2. Test build locally: `npm run build`
3. Fix errors and push again

---

## 🎉 Quick Reference Commands

### Backend (Server)

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Update
git pull && docker-compose up -d --build

# Health check
curl http://localhost/health
```

### Frontend (Local)

```bash
# Local dev
npm run dev

# Build
npm run build

# Deploy to Vercel
git push origin main  # Auto-deploys!
```

---

## 📞 Support Checklist

If something isn't working:

- [ ] Backend container is running: `docker-compose ps`
- [ ] Backend is accessible: `curl http://YOUR_IP`
- [ ] CORS headers present: `curl -I http://YOUR_IP`
- [ ] Firewall allows port 80: `ufw status`
- [ ] Frontend has correct backend IP in code
- [ ] Vercel deployment succeeded
- [ ] Browser console shows no CORS errors

---

## 🎊 Success!

Your Data Deployer application is now:

✅ **Frontend**: Live on Vercel with auto-deployment  
✅ **Backend**: Running in Docker with Nginx + Node.js  
✅ **Scalable**: Can handle growth  
✅ **Maintainable**: Easy updates via Git  
✅ **Cost-effective**: ~$6/month  
✅ **Professional**: HTTPS, monitoring, CI/CD ready  

**Test it**: Open your Vercel URL and start managing data validations! 🚀
