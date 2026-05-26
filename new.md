# Fresh Setup — What to Change and Where

## Step 1 — Create RDS (get the new endpoint + password)

AWS Console → RDS → Create database → MySQL 8.0
- Master username: `admin`
- Master password: *(set anything, note it down)*
- Initial DB name: `saista_bakers`
- Subnet group: your two backend subnets
- Public access: No
- Security group: `sg-rds`

After creation, copy the **Endpoint** from the Connectivity tab.

---

## Step 2 — Update these 3 files in the repo (only lines that change)

### `saista-user/src/.env.example`
```
DB_HOST=<paste new RDS endpoint here>
DB_PASSWORD=<paste new RDS password here>
SMTP_PASSWORD=<your Gmail App Password>
```

### `saista-order/src/.env.example`
```
DB_HOST=<paste new RDS endpoint here>
DB_PASSWORD=<paste new RDS password here>
```

### `saista-payment/src/.env.example`
```
DB_HOST=<paste new RDS endpoint here>
DB_PASSWORD=<paste new RDS password here>
SMTP_PASSWORD=<your Gmail App Password>
```

> Everything else in those files (DB_USER, DB_NAME, DB_PORT, SECRET_KEY, SMTP_SERVER, SMTP_PORT, SENDER_EMAIL, SMTP_USER) stays the same — do not touch.

---

## Step 3 — Push the repo

```bash
git add saista-user/src/.env.example saista-order/src/.env.example saista-payment/src/.env.example
git commit -m "update credentials for new deployment"
git push
```

---

## Step 4 — Launch Backend EC2 (Ubuntu 22.04, t3.small, Backend Subnet AZ-a, sg-backend)

```bash
ssh -i your-key.pem ubuntu@<backend-private-ip>
sudo apt update -qq && sudo apt install -y git
git clone https://github.com/<your-username>/<your-repo>.git
cd saista-helm-chart-1
bash infra/backend-setup.sh
```

Script does everything — installs Python, venvs, deps, Nginx, systemd, runs migration, starts services, prints health check.

---

## Step 5 — Launch Frontend EC2 (Ubuntu 22.04, t3.micro, Public Subnet AZ-a, sg-frontend)

```bash
ssh -i your-key.pem ubuntu@<frontend-public-ip>
sudo apt update -qq && sudo apt install -y git
git clone https://github.com/<your-username>/<your-repo>.git
cd saista-helm-chart-1
bash infra/frontend-setup.sh
```

---

## Step 6 — Create ALB

- 2 target groups: `tg-saista-frontend` (health: `/`) and `tg-saista-backend` (health: `/api/users/health`)
- ALB: internet-facing, both public subnets, `sg-alb`
- Listener rule: `/api/*` → `tg-saista-backend` (Priority 1), default → `tg-saista-frontend`
- Wait for both targets to show **healthy**

---

## Step 7 — Route 53

- Go to your hosted zone `saistabakers.com`
- The A record alias pointing to the ALB — **update it to point to the new ALB DNS**
- If ALB name/region didn't change, this may already work automatically

---

## Step 8 — Create AMIs and Auto Scaling Groups

1. Create image from Backend EC2 → `saista-backend-ami`
2. Create image from Frontend EC2 → `saista-frontend-ami`
3. Create Launch Templates using new AMIs
4. Create ASGs: min 2 / max 2, attach to respective target groups

---

## Quick reference — what changes every fresh deployment

| What | Where to update |
|------|----------------|
| RDS endpoint (`DB_HOST`) | All 3 `.env.example` files |
| RDS password (`DB_PASSWORD`) | All 3 `.env.example` files |
| Gmail App Password (`SMTP_PASSWORD`) | `saista-user` and `saista-payment` `.env.example` |
| ALB DNS alias | Route 53 A record for `saistabakers.com` |

**Nothing else in the codebase needs to change.**
