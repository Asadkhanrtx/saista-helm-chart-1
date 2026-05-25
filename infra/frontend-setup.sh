#!/bin/bash
set -e

# ── Colours ────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_SRC="$REPO_ROOT/saista-frontend/src"
info "Using repo root: $REPO_ROOT"

# ── 1. System dependencies ──────────────────────────────────────
info "Updating packages and installing Nginx..."
sudo apt update -qq
sudo apt install -y nginx
log "Nginx installed"

# ── 2. Install Node.js 18 ───────────────────────────────────────
if ! node --version 2>/dev/null | grep -q "^v18"; then
    info "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi
log "Node.js $(node --version) ready"

# ── 3. Install npm dependencies ─────────────────────────────────
info "Running npm install (this may take a minute)..."
cd "$FRONTEND_SRC"
npm install --silent
log "npm dependencies installed"

# ── 4. Build the React app ──────────────────────────────────────
info "Building React app (this may take 1-2 minutes)..."
# CI=false prevents create-react-app from treating warnings as errors
CI=false npm run build
log "React build complete"

# ── 5. Deploy to Nginx web root ─────────────────────────────────
info "Deploying build to /var/www/html/..."
sudo rm -rf /var/www/html/*
sudo cp -r "$FRONTEND_SRC/build/." /var/www/html/
sudo chown -R www-data:www-data /var/www/html
log "Build deployed to /var/www/html/"

# ── 6. Configure Nginx for SPA ──────────────────────────────────
info "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/saista-frontend > /dev/null << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/saista-frontend /etc/nginx/sites-enabled/saista-frontend
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
log "Nginx configured and running"

# ── 7. Health checks ────────────────────────────────────────────
echo ""
echo -e "${BLUE}── Verifying deployment ──────────────────────────────${NC}"
fail=0

# React app root
if curl -sf http://localhost/ > /dev/null; then
    log "/ — OK (React app)"
else
    warn "/ — FAILED"
    fail=1
fi

# Images — spot-check a few gallery files
for img in img1.jpeg strawberry.png vanilla.png cookies.png; do
    if curl -sf "http://localhost/images/gallery/$img" > /dev/null; then
        log "/images/gallery/$img — OK"
    else
        warn "/images/gallery/$img — NOT FOUND"
        fail=1
    fi
done

echo ""
if [ $fail -eq 0 ]; then
    echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Frontend EC2 is fully set up!${NC}"
    echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Create an AMI from this instance (AWS Console → EC2 → Actions → Create Image)"
    echo "  2. Name it: saista-frontend-ami"
else
    echo -e "${RED}Some checks failed.${NC}"
    echo ""
    echo "Check image files:"
    echo "  ls /var/www/html/images/gallery/"
    echo ""
    echo "If the images/ directory is missing, the public/ folder wasn't in the build."
    echo "Re-run: CI=false npm run build && sudo cp -r $FRONTEND_SRC/build/. /var/www/html/"
fi