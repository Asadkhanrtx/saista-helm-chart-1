#!/bin/bash
set -e

# ── Colours ────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
info "Using repo root: $REPO_ROOT"

# ── 1. System dependencies ──────────────────────────────────────
info "Updating packages and installing dependencies..."
sudo apt update -qq
sudo apt install -y nginx gcc software-properties-common

# Python 3.11 via deadsnakes PPA
if ! python3.11 --version &>/dev/null 2>&1; then
    sudo add-apt-repository ppa:deadsnakes/ppa -y
    sudo apt update -qq
fi
sudo apt install -y python3.11 python3.11-venv python3.11-dev
log "System packages ready (nginx, python3.11)"

# ── 2. Create deployment directories ───────────────────────────
info "Creating /opt/saista/* directories..."
sudo mkdir -p /opt/saista/user-service
sudo mkdir -p /opt/saista/order-service
sudo mkdir -p /opt/saista/payment-service
sudo chown -R ubuntu:ubuntu /opt/saista
log "Directories ready"

# ── 3. Copy service source files ───────────────────────────────
info "Copying service files from repo..."
cp -r "$REPO_ROOT/saista-user/src/."    /opt/saista/user-service/
cp -r "$REPO_ROOT/saista-order/src/."   /opt/saista/order-service/
cp -r "$REPO_ROOT/saista-payment/src/." /opt/saista/payment-service/
log "Service files copied"

# ── 4. Python virtual envs + pip install ───────────────────────
for svc in user-service order-service payment-service; do
    info "Setting up venv for $svc..."
    cd /opt/saista/$svc
    [ ! -d venv ] && python3.11 -m venv venv
    venv/bin/pip install --upgrade pip -q
    venv/bin/pip install -r requirements.txt -q
    log "$svc dependencies installed"
done

# ── 5. Create .env files from templates ────────────────────────
info "Creating .env files from templates..."
cp "$REPO_ROOT/saista-user/src/.env.example"    /opt/saista/user-service/.env
cp "$REPO_ROOT/saista-order/src/.env.example"   /opt/saista/order-service/.env
cp "$REPO_ROOT/saista-payment/src/.env.example" /opt/saista/payment-service/.env
log ".env files created"

# ── 6. Pause — user must fill in real values ───────────────────
echo ""
echo -e "${YELLOW}══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  FILL IN YOUR .env FILES BEFORE CONTINUING${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════════${NC}"
echo ""
echo "Open each file and replace the placeholder values:"
echo ""
echo "  DB_HOST        →  your RDS endpoint"
echo "  DB_PASSWORD    →  your RDS master password"
echo "  SMTP_PASSWORD  →  your Gmail App Password"
echo ""
echo "Commands to edit (run in separate terminal or use nano here):"
echo "  nano /opt/saista/user-service/.env"
echo "  nano /opt/saista/order-service/.env"
echo "  nano /opt/saista/payment-service/.env"
echo ""
read -rp "Press [Enter] once you have saved all three .env files..."

# ── 7. Validate .env files are not still placeholders ──────────
for svc in user-service order-service payment-service; do
    if grep -q "YOUR_RDS_ENDPOINT" /opt/saista/$svc/.env; then
        err "$svc/.env still has placeholder values. Edit it and re-run."
    fi
done
log ".env files look good (no placeholders detected)"

# ── 8. Configure backend Nginx ─────────────────────────────────
info "Configuring Nginx..."
sudo cp "$REPO_ROOT/infra/backend-nginx.conf" /etc/nginx/conf.d/saista-backend.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
log "Nginx configured and running"

# ── 9. Install systemd service units ───────────────────────────
info "Installing systemd units..."
sudo cp "$REPO_ROOT/infra/saista-user.service"    /etc/systemd/system/
sudo cp "$REPO_ROOT/infra/saista-order.service"   /etc/systemd/system/
sudo cp "$REPO_ROOT/infra/saista-payment.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable saista-user saista-order saista-payment
log "systemd units installed and enabled"

# ── 10. Run database migration ─────────────────────────────────
info "Running database migration (user-service owns the schema)..."
cd /opt/saista/user-service
venv/bin/python migrate_db.py
log "Migration complete"

# ── 11. Start all services ─────────────────────────────────────
info "Starting all services..."
sudo systemctl start saista-user saista-order saista-payment

# Wait up to 20s for services to come up
info "Waiting for services to become healthy..."
for i in {1..10}; do
    all_up=true
    for port in 5001 5002 5003; do
        curl -sf "http://localhost:$port/health" > /dev/null 2>&1 || all_up=false
    done
    $all_up && break
    sleep 2
done

# ── 12. Health checks ──────────────────────────────────────────
echo ""
echo -e "${BLUE}── Direct health checks ──────────────────────────────${NC}"
fail=0
for port_svc in "5001:user-service" "5002:order-service" "5003:payment-service"; do
    port="${port_svc%%:*}"; svc="${port_svc##*:}"
    if curl -sf "http://localhost:$port/health" > /dev/null; then
        log "$svc (:$port) — healthy"
    else
        warn "$svc (:$port) — NOT responding"
        fail=1
    fi
done

echo ""
echo -e "${BLUE}── Through Nginx (/api/*) ────────────────────────────${NC}"
for path_svc in "/api/users/health:user-service" "/api/orders/health:order-service" "/api/payment/health:payment-service"; do
    path="${path_svc%%:*}"; svc="${path_svc##*:}"
    if curl -sf "http://localhost$path" > /dev/null; then
        log "$path — OK"
    else
        warn "$path — FAILED"
        fail=1
    fi
done

echo ""
if [ $fail -eq 0 ]; then
    echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Backend EC2 is fully set up and all services healthy!${NC}"
    echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Create an AMI from this instance (AWS Console → EC2 → Actions → Create Image)"
    echo "  2. Name it: saista-backend-ami"
else
    echo -e "${RED}Some services failed to start. Check logs:${NC}"
    echo "  sudo journalctl -u saista-user    -n 50 --no-pager"
    echo "  sudo journalctl -u saista-order   -n 50 --no-pager"
    echo "  sudo journalctl -u saista-payment -n 50 --no-pager"
fi