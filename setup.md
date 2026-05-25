# Saista Bakers — EC2 + ALB + RDS Deployment Guide (Ubuntu)

## Architecture Overview

```
Internet
   │
   ▼
ALB  (spans Public Subnet AZ-a  +  Public Subnet AZ-b)
   │
   ├─ /api/*  ──► Backend TG
   │               ├─ Backend EC2-1 (Backend Subnet AZ-a)  ─┐
   │               └─ Backend EC2-2 (Backend Subnet AZ-b)  ─┤── Nginx :80
   │                                                          │   ├─ /api/users/*   → :5001
   │                                                          │   ├─ /api/orders/*  → :5002
   │                                                          │   └─ /api/payment/* → :5003
   │                                                          │
   │                                              RDS MySQL (backend subnets)
   │
   └─ /*      ──► Frontend TG
                   ├─ Frontend EC2-1 (Public Subnet AZ-a)  ─┐
                   └─ Frontend EC2-2 (Public Subnet AZ-b)  ─┴── Nginx :80 → React build
```

## Subnet Plan (reuse existing subnets — no new ones needed)

| Subnet           | AZ    | What runs here                          |
|------------------|-------|-----------------------------------------|
| Public Subnet A  | AZ-a  | ALB + Frontend EC2-1                    |
| Public Subnet B  | AZ-b  | ALB + Frontend EC2-2                    |
| Backend Subnet A | AZ-a  | Backend EC2-1                           |
| Backend Subnet B | AZ-b  | Backend EC2-2                           |
| RDS DB Subnet Group | both AZs | Points at Backend Subnet A + B   |

> RDS uses your existing backend subnets via a DB Subnet Group. No new subnets or route tables needed.

## Security Groups (create these first)

| Name            | Inbound                              | Purpose              |
|-----------------|--------------------------------------|----------------------|
| `sg-alb`        | TCP 80 from 0.0.0.0/0                | ALB internet traffic |
| `sg-frontend`   | TCP 80 from `sg-alb`                 | Frontend EC2s        |
| `sg-backend`    | TCP 80 from `sg-alb`                 | Backend EC2s         |
| `sg-rds`        | TCP 3306 from `sg-backend`           | RDS MySQL            |

All SGs: allow all outbound traffic.

---

## Step 1 — Create RDS MySQL

1. **AWS Console → RDS → Create database**
   - Engine: **MySQL 8.0**
   - Template: Free tier (for test) / Production (for prod)
   - DB identifier: `saista-bakers-db`
   - Master username: `admin`
   - Master password: *(strong password — note it down)*
   - Initial DB name: `saista_bakers`
   - VPC: your VPC
   - Subnet group: **Create new** → select **Backend Subnet A + Backend Subnet B**
   - Public access: **No**
   - Security group: `sg-rds`
   - Port: 3306

2. Wait for status → **Available** (~5 min).
3. Copy the **Endpoint** (e.g. `saista-bakers-db.xxxxxxx.us-east-1.rds.amazonaws.com`).

---

## Step 2 — Set Up ONE Backend EC2, then Create AMI

You set up one backend EC2 fully, verify everything works, then create an AMI. Auto Scaling will launch the second (and more) from that AMI.

### 2a. Launch Backend EC2-1

- AMI: **Ubuntu 22.04 LTS** (search "ubuntu 22.04" in AMI catalog)
- Instance type: `t3.small` (runs 3 Python services)
- Subnet: **Backend Subnet AZ-a**
- Auto-assign public IP: **No** (private subnet)
- Security group: `sg-backend`
- Key pair: your existing key pair
- Storage: 20 GB gp3

### 2b. SSH into the instance

> Backend EC2 is in a private subnet — SSH via a bastion host, or use **AWS Systems Manager → Session Manager** (no bastion needed if SSM agent is installed).

```bash
ssh -i your-key.pem ubuntu@<backend-private-ip>
```

### 2c. Install Git and clone the repo

```bash
sudo apt update -qq && sudo apt install -y git
git clone https://github.com/<your-username>/<your-repo>.git
cd saista-helm-chart-1
```

### 2d. Run the backend setup script

The script does everything in one go: installs Python 3.11, creates venvs, installs pip dependencies, copies service files, sets up Nginx, installs systemd units, and starts all three services. It will pause midway so you can fill in your `.env` values.

```bash
bash infra/backend-setup.sh
```

When the script pauses, open a **second terminal** to the same EC2 and edit the three `.env` files:

```bash
# Fill in: DB_HOST, DB_PASSWORD, SMTP_PASSWORD
nano /opt/saista/user-service/.env
nano /opt/saista/order-service/.env
nano /opt/saista/payment-service/.env
```

Then go back to the first terminal and press **Enter** to continue. The script will run the migration, start the services, and print a health check summary.

> **DB migration note:** The script runs `migrate_db.py` automatically. This creates all tables and seeds:
> - Admin user: `asadadmin` / `Asad@1234`
> - 5 sample products (cakes + cookies)
>
> Migration is idempotent — safe to re-run, it won't duplicate data.

### 2e. Create Backend AMI

1. **AWS Console → EC2 → Instances → select Backend EC2-1**
2. **Actions → Image and templates → Create image**
3. Name: `saista-backend-ami`
4. No reboot: **unchecked** (cleaner snapshot)
5. Click **Create image** — wait ~5 min.

> This AMI bakes in: Python 3.11, venvs, all dependencies, .env files, Nginx config, and systemd units. Any new EC2 launched from it is production-ready immediately.

---

## Step 3 — Set Up ONE Frontend EC2, then Create AMI

### 3a. Launch Frontend EC2-1

- AMI: **Ubuntu 22.04 LTS**
- Instance type: `t3.micro`
- Subnet: **Public Subnet AZ-a**
- Auto-assign public IP: **Yes** (needed for direct SSH + npm build)
- Security group: `sg-frontend`
- Key pair: your existing key pair
- Storage: 20 GB gp3

### 3b. SSH into the instance

```bash
ssh -i your-key.pem ubuntu@<frontend-public-ip>
```

### 3c. Install Git and clone the repo

```bash
sudo apt update -qq && sudo apt install -y git
git clone https://github.com/<your-username>/<your-repo>.git
cd saista-helm-chart-1
```

### 3d. Run the frontend setup script

The script installs Node.js 18, runs `npm install` and `npm run build`, deploys the build to `/var/www/html/`, configures Nginx for the React SPA, and verifies that all images load correctly — no manual steps needed.

```bash
bash infra/frontend-setup.sh
```

The script prints a health check at the end confirming the app and all gallery images (`img1.jpeg` through `img13.jpeg`, `strawberry.png`, `vanilla.png`, `cookies.png`) respond with 200.

### 3e. Create Frontend AMI

1. **AWS Console → EC2 → Instances → select Frontend EC2-1**
2. **Actions → Image and templates → Create image**
3. Name: `saista-frontend-ami`
4. No reboot: **unchecked**
5. Click **Create image** — wait ~5 min.

---

## Step 4 — Create the Application Load Balancer

### 4a. Create Target Groups

**Frontend Target Group**
- Target type: Instances
- Name: `tg-saista-frontend`
- Protocol: HTTP, Port: **80**
- VPC: your VPC
- Health check path: `/`
- Thresholds: Healthy 2 / Unhealthy 3 / Interval 30s
- Register targets: Frontend EC2-1

**Backend Target Group**
- Target type: Instances
- Name: `tg-saista-backend`
- Protocol: HTTP, Port: **80**
- VPC: your VPC
- Health check path: `/api/users/health`
- Thresholds: Healthy 2 / Unhealthy 3 / Interval 30s
- Register targets: Backend EC2-1

### 4b. Create the ALB

1. **EC2 → Load Balancers → Create → Application Load Balancer**
2. Name: `saista-alb`
3. Scheme: **Internet-facing**
4. IP address type: IPv4
5. VPC: your VPC
6. Mappings: **Public Subnet AZ-a** + **Public Subnet AZ-b**
7. Security group: `sg-alb`
8. Listener HTTP:80 → Default action: Forward to `tg-saista-frontend`
9. Create.

### 4c. Add /api/* routing rule

1. **Listeners → HTTP:80 → Manage rules → Add rule**
2. Name: `api-backend`
3. Condition: **Path** → `/api/*`
4. Action: Forward to `tg-saista-backend`
5. Priority: **1** (above the default rule)
6. Save.

### 4d. Wait for health checks to pass

- **Target Groups → tg-saista-frontend** → Frontend EC2-1 shows **healthy**
- **Target Groups → tg-saista-backend** → Backend EC2-1 shows **healthy**

---

## Step 5 — End-to-End Test

Get the ALB DNS name from Load Balancers (e.g. `saista-alb-123456.us-east-1.elb.amazonaws.com`).

```bash
ALB=saista-alb-123456.us-east-1.elb.amazonaws.com

# 1. Frontend loads
curl -I http://$ALB/

# 2. API health checks through ALB
curl http://$ALB/api/users/health
curl http://$ALB/api/orders/health
curl http://$ALB/api/payment/health

# 3. Signup
curl -X POST http://$ALB/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test@1234","full_name":"Test User"}'

# 4. Login — capture token
TOKEN=$(curl -s -X POST http://$ALB/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test@1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 5. List products
curl http://$ALB/api/users/products

# 6. Add to cart
curl -X POST http://$ALB/api/orders/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id":1,"quantity":1}'
```

Open `http://$ALB/` in a browser — the full React app should load with images.

Admin panel: `http://$ALB/admin/login` → `asadadmin` / `Asad@1234`

---

## Step 6 — Launch Templates + Auto Scaling Groups (after AMIs are ready)

### Frontend Launch Template

1. **EC2 → Launch Templates → Create**
2. Name: `lt-saista-frontend`
3. AMI: `saista-frontend-ami`
4. Instance type: `t3.micro`
5. Key pair: your key pair
6. Security group: `sg-frontend`
7. No public IP needed once behind ALB (or keep enabled for SSH)

### Frontend Auto Scaling Group

1. **EC2 → Auto Scaling Groups → Create**
2. Launch template: `lt-saista-frontend`
3. VPC + Subnets: **Public Subnet AZ-a + Public Subnet AZ-b**
4. Load balancing: Attach to `tg-saista-frontend`
5. Desired: 2, Min: 1, Max: 4
6. Health check: ELB, Grace period: 60s

### Backend Launch Template

1. **EC2 → Launch Templates → Create**
2. Name: `lt-saista-backend`
3. AMI: `saista-backend-ami`
4. Instance type: `t3.small`
5. Key pair: your key pair
6. Security group: `sg-backend`

### Backend Auto Scaling Group

1. Launch template: `lt-saista-backend`
2. VPC + Subnets: **Backend Subnet AZ-a + Backend Subnet AZ-b**
3. Load balancing: Attach to `tg-saista-backend`
4. Desired: 2, Min: 1, Max: 4
5. Health check: ELB, Grace period: 90s

> After the ASG launches new EC2s from the AMI, they register with the target group and the ALB starts sending traffic to them automatically. You can then terminate the original EC2-1 instances.

---

## Troubleshooting

### Service not starting on backend EC2

```bash
sudo journalctl -u saista-user --no-pager -n 50
sudo journalctl -u saista-order --no-pager -n 50
sudo journalctl -u saista-payment --no-pager -n 50
```

### Cannot connect to RDS

```bash
# Test connectivity from backend EC2
nc -zv YOUR_RDS_ENDPOINT 3306
# "Connection to ... succeeded" = SG and routing are correct
# Hangs = SG-rds missing inbound from sg-backend
```

### ALB returns 502

The backend Nginx is healthy but a FastAPI service is down:

```bash
sudo systemctl status saista-user saista-order saista-payment
curl http://localhost:5001/health   # test each directly
```

### Images return 404

```bash
ls /var/www/html/images/gallery/
# If empty: build didn't copy public/ folder
sudo cp -r /home/ubuntu/frontend-src/build/* /var/www/html/
sudo systemctl reload nginx
```

---

## Port Reference

| Component          | Port | Location                   |
|--------------------|------|----------------------------|
| ALB                | 80   | Public (internet-facing)   |
| Frontend Nginx     | 80   | Frontend EC2s (public)     |
| Backend Nginx      | 80   | Backend EC2s (private)     |
| user-service       | 5001 | Backend EC2 only (internal)|
| order-service      | 5002 | Backend EC2 only (internal)|
| payment-service    | 5003 | Backend EC2 only (internal)|
| RDS MySQL          | 3306 | Private (backend SG only)  |