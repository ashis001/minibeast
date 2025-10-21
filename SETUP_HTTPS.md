# 🔒 Setup HTTPS for Backend (No Domain Required)

Use Cloudflare Tunnel to get a free HTTPS URL for your backend.

---

## 🚀 Quick Setup (5 minutes)

### Step 1: SSH into Your Droplet

```bash
ssh root@64.227.183.35
cd minibeast
```

### Step 2: Install Cloudflare Tunnel

```bash
# Download cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install it
dpkg -i cloudflared.deb

# Verify installation
cloudflared --version
```

### Step 3: Authenticate with Cloudflare

```bash
# This will open a browser - login with Google/GitHub (free)
cloudflared tunnel login
```

**You'll see a URL like:** `https://dash.cloudflare.com/...`
- Copy and paste it in your browser
- Login (it's free, no credit card needed)
- Authorize the tunnel

### Step 4: Create Your Tunnel

```bash
# Create a tunnel (replace 'minibeast-api' with any name)
cloudflared tunnel create minibeast-api
```

**You'll get output like:**
```
Created tunnel minibeast-api with id 123abc...
```

**Copy the tunnel ID!**

### Step 5: Configure the Tunnel

```bash
# Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID_HERE.json

ingress:
  - hostname: YOUR_TUNNEL_SUBDOMAIN.trycloudflare.com
    service: http://localhost:80
  - service: http_status:404
EOF
```

**Replace:**
- `YOUR_TUNNEL_ID_HERE` with the ID from step 4
- `YOUR_TUNNEL_SUBDOMAIN` with any name you want

### Step 6: Route the Tunnel

```bash
# Get a random free subdomain
cloudflared tunnel route dns minibeast-api minibeast-api
```

**OR use a custom subdomain (if you created Cloudflare account with a domain):**
```bash
cloudflared tunnel route dns minibeast-api api.yourdomain.com
```

### Step 7: Run the Tunnel

```bash
# Run in background
cloudflared tunnel run minibeast-api &
```

**You'll get a URL like:**
```
https://minibeast-api-xyz.trycloudflare.com
```

**Copy this URL!** This is your HTTPS backend URL.

### Step 8: Make it Permanent

```bash
# Install as a service so it auto-starts
cloudflared service install

# Start the service
systemctl start cloudflared
systemctl enable cloudflared

# Check status
systemctl status cloudflared
```

---

## ✅ Test Your HTTPS Backend

```bash
# From your Mac
curl https://YOUR-TUNNEL-URL.trycloudflare.com/api/test-aws
```

You should see: `Cannot GET` (that's correct - it needs POST)

Test properly:
```bash
curl -X POST https://YOUR-TUNNEL-URL.trycloudflare.com/api/test-aws \
  -H "Content-Type: application/json" \
  -d '{"accessKey":"test","secretKey":"test","region":"us-east-1"}'
```

Should return JSON error about AWS credentials ✅

---

## 🔄 Update Frontend

Update all your API endpoints from:
```
http://64.227.183.35
```

To:
```
https://YOUR-TUNNEL-URL.trycloudflare.com
```

Then commit and push!

---

## 📋 Quick Reference

```bash
# Check tunnel status
systemctl status cloudflared

# View logs
journalctl -u cloudflared -f

# Restart tunnel
systemctl restart cloudflared

# List tunnels
cloudflared tunnel list
```

---

## 🎁 Benefits

✅ **Free** - No cost
✅ **No domain needed** - Cloudflare provides subdomain
✅ **HTTPS** - Full SSL/TLS encryption
✅ **Fast** - Cloudflare CDN
✅ **DDoS protection** - Cloudflare's network
✅ **Auto-restart** - Systemd service

---

## Alternative: Quick Temporary Tunnel (No Login)

For quick testing only:

```bash
# Run this on your droplet
cloudflared tunnel --url http://localhost:80
```

This gives you a temporary HTTPS URL (expires when you close terminal).

---

**Your backend will be accessible at:**
```
https://your-tunnel-name.trycloudflare.com
```
