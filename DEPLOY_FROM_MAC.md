# 🍎 Deploy to DigitalOcean from Mac

Quick guide to deploy Data Deployer backend to your DigitalOcean droplet from your Mac.

---

## 📋 Prerequisites

- ✅ DigitalOcean droplet created (Ubuntu)
- ✅ Droplet IP: **64.227.183.35**
- ✅ Root password or SSH key
- ✅ Terminal app on Mac

---

## 🚀 Deployment Steps

### Step 1: Open Terminal on Mac

```bash
# Press Cmd+Space, type "Terminal" and press Enter
# Or go to Applications → Utilities → Terminal
```

### Step 2: SSH into Your Droplet

```bash
ssh root@64.227.183.35
```

When prompted:
- Type `yes` to accept fingerprint (first time only)
- Enter your droplet password

### Step 3: Install Docker (On Droplet)

```bash
# Update system packages
apt update && apt upgrade -y

# Install Docker using official script
curl -fsSL https://get.docker.com | sh

# Verify Docker is installed
docker --version
docker compose version
```

Expected output:
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

### Step 4: Clone Your Repository (On Droplet)

```bash
# Clone from GitHub
git clone https://github.com/ashis001/minibeast.git

# Navigate to project
cd minibeast

# Verify files
ls -la
```

You should see:
- `Dockerfile`
- `docker-compose.yml`
- `deploy.sh`
- `server/` directory

### Step 5: Deploy Backend with Docker (On Droplet)

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run quick deploy script
./deploy.sh

# OR manually:
docker-compose up -d
```

Expected output:
```
✅ Docker installed
✅ Docker Compose installed
🏗️  Building and starting containers...
Creating data-deployer ... done
✅ Backend is healthy!
```

### Step 6: Configure Firewall (On Droplet)

```bash
# Allow HTTP traffic (port 80)
ufw allow 80/tcp

# Allow HTTPS (port 443) - for future SSL
ufw allow 443/tcp

# Allow SSH (important - don't lock yourself out!)
ufw allow OpenSSH

# Enable firewall
ufw --force enable

# Check firewall status
ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
OpenSSH                    ALLOW       Anywhere
```

### Step 7: Test Backend Deployment (On Droplet)

```bash
# Test locally on droplet
curl http://localhost

# Test with CORS headers
curl -I http://localhost
```

Expected headers:
```
HTTP/1.1 404 Not Found
Server: nginx
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Step 8: Test from Your Mac

Open a **new Terminal window** on your Mac (keep SSH session open) and run:

```bash
# Test from Mac
curl http://64.227.183.35

# Test with headers
curl -I http://64.227.183.35
```

If you see the same response with CORS headers, **deployment is successful!** ✅

---

## 🔍 Useful Commands

### On Your Droplet (via SSH)

```bash
# View container status
docker-compose ps

# View logs (real-time)
docker-compose logs -f

# View last 100 log lines
docker-compose logs --tail=100

# Restart containers
docker-compose restart

# Stop containers
docker-compose down

# Start containers
docker-compose up -d

# Update code and redeploy
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Check Container Health

```bash
# Check if container is running
docker ps

# Check health status
docker inspect --format='{{.State.Health.Status}}' data-deployer

# Execute commands inside container
docker exec -it data-deployer sh
```

### Exit SSH Session

```bash
# Type 'exit' to leave droplet and return to Mac terminal
exit
```

---

## 🔄 Update Frontend to Use New Backend

Back on your **Mac**, update the API endpoints in your code:

```bash
# Open project in your editor
cd /Users/nitishpradhan/Documents/data-deployer-main
```

Update these files - change IP from `134.209.148.250` to `64.227.183.35`:

1. `src/components/ConfigurationStep.tsx`
2. `src/components/ViewValidations.tsx`
3. `src/components/ValidationStep.tsx`
4. `src/components/ActivityLog.tsx`
5. `src/components/DeploymentStep.tsx`
6. `src/components/DeploymentWizard.tsx`
7. `src/components/ProgressStep.tsx`

**Find and replace:**
```javascript
// From:
fetch('http://134.209.148.250/api/...

// To:
fetch('http://64.227.183.35/api/...
```

Then commit and push:

```bash
git add .
git commit -m "Update API endpoints to new droplet (64.227.183.35)"
git push origin main
```

Vercel will auto-deploy the updated frontend!

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| SSH to droplet | `ssh root@64.227.183.35` |
| Start containers | `docker-compose up -d` |
| Stop containers | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Restart | `docker-compose restart` |
| Update code | `git pull && docker-compose up -d --build` |
| Exit SSH | `exit` |

---

## 🐛 Troubleshooting

### Can't SSH from Mac

```bash
# If you get "Permission denied"
# Make sure you have the correct password

# If you get "Connection refused"
# Check droplet IP and that droplet is running in DigitalOcean dashboard
```

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Check if port 80 is in use
netstat -tulpn | grep 80

# Try rebuilding
docker-compose down
docker-compose up -d --build
```

### Backend Not Accessible from Mac

```bash
# SSH into droplet and check firewall
ufw status

# Make sure port 80 is allowed
ufw allow 80/tcp

# Check if container is running
docker-compose ps
```

### "Permission denied" on deploy.sh

```bash
# Make it executable
chmod +x deploy.sh
```

---

## 🎉 Success Checklist

- [ ] SSH connection works from Mac
- [ ] Docker installed on droplet
- [ ] Repository cloned
- [ ] Containers running (`docker-compose ps` shows "Up")
- [ ] Firewall configured
- [ ] Backend accessible from Mac (`curl http://64.227.183.35`)
- [ ] CORS headers present
- [ ] Frontend updated with new IP
- [ ] Vercel deployed updated frontend

---

## 💡 Pro Tips

1. **Keep SSH window open** while testing
2. **Use separate Terminal tabs** (Cmd+T) for different tasks
3. **Save your SSH password** in Keychain for easy access
4. **Monitor logs** with `docker-compose logs -f` during deployment
5. **Test from browser** after curl tests pass: `http://64.227.183.35`

---

## 📞 Need Help?

If something isn't working:

1. Check droplet is running in DigitalOcean dashboard
2. SSH into droplet: `ssh root@64.227.183.35`
3. Check logs: `docker-compose logs -f`
4. Check firewall: `ufw status`
5. Restart containers: `docker-compose restart`

---

**Ready to deploy? Start with Step 1!** 🚀
