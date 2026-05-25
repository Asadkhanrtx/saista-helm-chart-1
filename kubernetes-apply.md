# Saista Bakers — Kubernetes Deployment Guide

## Architecture overview

```
Internet
   │
   ▼
Gateway (port 80)              ← saista-mysql-db/k8s/gateway.yaml
   │
   ├─ /api/users/*   ──►  user-service:5001
   ├─ /api/orders/*  ──►  order-service:5002
   ├─ /api/payment/* ──►  payment-service:5003
   └─ /*             ──►  frontend:80

MySQL StatefulSet  ──►  NFS CSI driver  ──►  172.31.35.135:/exports/saista/mysql
                                              (separate NFS instance)
All pods run in namespace: dev
```

---

## Prerequisites checklist

- [ ] `kubectl` configured and pointing at your cluster
- [ ] `helm` installed on your local machine
- [ ] Docker images pushed to Docker Hub (`asadoblivion/*`)
- [ ] NFS server instance (172.31.35.135) is running and reachable from all K8s nodes
- [ ] All 5 repos cloned (Step 0)

---

## STEP 0 — Clone all repositories

```bash
mkdir saista-k8s && cd saista-k8s

git clone https://github.com/<your-org>/saista-mysql-db.git
git clone https://github.com/<your-org>/saista-user.git
git clone https://github.com/<your-org>/saista-order.git
git clone https://github.com/<your-org>/saista-payment.git
git clone https://github.com/<your-org>/saista-frontend.git
```

---

## STEP 1 — Prepare the NFS server  (run ON the NFS instance: 172.31.35.135)

SSH into your NFS server and run:

```bash
# Install NFS server
sudo apt update && sudo apt install -y nfs-kernel-server

# Create the exact export path the CSI driver will mount
sudo mkdir -p /exports/saista/mysql
sudo chmod 777 /exports/saista/mysql

# Register the export
echo "/exports/saista/mysql *(rw,sync,no_subtree_check,no_root_squash)" \
  | sudo tee -a /etc/exports

# Apply exports
sudo exportfs -ra

# Verify
sudo exportfs -v
# Expected: /exports/saista/mysql  <world>(rw,sync,no_root_squash,...)

# Open NFS port in firewall (if ufw is active)
sudo ufw allow 2049
sudo ufw reload
```

---

## STEP 2 — Prepare every Kubernetes worker node  (run on EACH node)

```bash
# Install NFS client — required for the CSI driver to mount NFS volumes
sudo apt update && sudo apt install -y nfs-common

# Test NFS reachability from this node
showmount -e 172.31.35.135
# Expected:
# Export list for 172.31.35.135:
# /exports/saista/mysql *
```

---

## STEP 3 — Install the NFS CSI driver on the cluster

```bash
# Add the CSI driver Helm repo
helm repo add csi-driver-nfs \
  https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm repo update

# Install the driver into kube-system
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system \
  --version v4.9.0

# Wait for driver pods to be running
kubectl rollout status daemonset/csi-nfs-node \
  -n kube-system --timeout=90s
kubectl rollout status deployment/csi-nfs-controller \
  -n kube-system --timeout=90s

# Verify the CSI driver is registered
kubectl get csidrivers nfs.csi.k8s.io
```

---

## STEP 4 — Install Gateway API CRDs + controller

```bash
# Install Gateway API CRDs (v1.2.0)
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml

# Verify CRDs
kubectl get crd gateways.gateway.networking.k8s.io
kubectl get crd httproutes.gateway.networking.k8s.io

# Install Envoy Gateway controller
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version v1.2.0 \
  --namespace envoy-gateway-system \
  --create-namespace

kubectl rollout status deployment/envoy-gateway \
  -n envoy-gateway-system --timeout=90s
```

> Using a different controller (Kong, nginx-gateway-fabric, Istio)?
> Edit `saista-mysql-db/k8s/gatewayclass.yaml` and change `controllerName` before Step 5.

---

## STEP 5 — Apply infrastructure  (from saista-mysql-db repo)

```bash
cd saista-mysql-db

# 5a. Create the dev namespace
kubectl apply -f k8s/namespace.yaml
kubectl get namespace dev

# 5b. Apply NFS StorageClass
#     (no PV needed — the CSI driver provisions volumes dynamically)
kubectl apply -f k8s/storageclass.yaml
kubectl get storageclass nfs-storage

# 5c. MySQL Secret + ConfigMap
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

# 5d. Deploy MySQL StatefulSet + headless Service
kubectl apply -f k8s/statefulset.yaml

# The StatefulSet creates PVC "mysql-data-mysql-0" automatically.
# The CSI driver sees the PVC and provisions a volume at:
#   172.31.35.135:/exports/saista/mysql  (mounted into the pod)

# Wait for MySQL pod to be fully Ready — DO NOT proceed until this passes
echo "Waiting for MySQL to be Ready..."
kubectl wait --for=condition=ready pod/mysql-0 \
  --namespace dev --timeout=180s

# Confirm MySQL accepts connections
kubectl exec -n dev mysql-0 -- \
  mysqladmin ping -h 127.0.0.1 -u root -pAsad@1234
# Expected: mysqld is alive

# 5e. Apply GatewayClass and Gateway
kubectl apply -f k8s/gatewayclass.yaml
kubectl apply -f k8s/gateway.yaml

# Verify Gateway is accepted
kubectl get gateway saista-gateway -n dev
# PROGRAMMED column should show: True

cd ..
```

---

## STEP 6 — Run DB migration  (automated one-time Job — from saista-user repo)

This creates all tables, seeds admin user, and seeds initial products.

```bash
cd saista-user

# 6a. Apply Secret + ConfigMap (the Job reads from these)
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

# 6b. Apply the migration script ConfigMap
kubectl apply -f k8s/migration-configmap.yaml

# 6c. Run the migration Job
kubectl apply -f k8s/migration-job.yaml

# 6d. Wait for Job to complete — DO NOT proceed until this passes
echo "Waiting for DB migration to complete..."
kubectl wait --for=condition=complete job/db-migrate \
  --namespace dev --timeout=180s

# Check migration output
kubectl logs -n dev job/db-migrate
# Expected last line: Migration complete! Database is ready.

cd ..
```

**What happens inside the Job:**
1. `initContainer` (busybox) — polls `mysql:3306` every 3 sec until MySQL is accepting connections
2. `main container` (user-service image) — runs `migrate_db.py` from the ConfigMap:
   - Creates all 5 tables: `users`, `products`, `orders`, `order_items`, `custom_orders`
   - Seeds admin user (`asadadmin`)
   - Seeds 5 initial products
3. Job exits → auto-deletes after 5 min (`ttlSecondsAfterFinished: 300`)

---

## STEP 7 — Deploy user-service

```bash
cd saista-user

# Secret + ConfigMap already applied in Step 6
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml

kubectl rollout status deployment/user-service -n dev --timeout=120s

kubectl apply -f k8s/httproute.yaml

cd ..
```

---

## STEP 8 — Deploy order-service

```bash
cd saista-order

kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml

kubectl rollout status deployment/order-service -n dev --timeout=120s

kubectl apply -f k8s/httproute.yaml

cd ..
```

---

## STEP 9 — Deploy payment-service

```bash
cd saista-payment

kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml

kubectl rollout status deployment/payment-service -n dev --timeout=120s

kubectl apply -f k8s/httproute.yaml

cd ..
```

---

## STEP 10 — Deploy frontend

```bash
cd saista-frontend

kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml

kubectl rollout status deployment/frontend -n dev --timeout=120s

# Apply LAST — catch-all route must come after all /api/* routes
kubectl apply -f k8s/httproute.yaml

cd ..
```

---

## STEP 11 — Verify the full stack

```bash
# All pods Running
kubectl get pods -n dev

# PVC bound by NFS CSI driver
kubectl get pvc -n dev
# NAME                    STATUS   VOLUME                 STORAGECLASS
# mysql-data-mysql-0      Bound    pvc-xxxx...            nfs-storage

# Gateway has external address
kubectl get gateway saista-gateway -n dev

# All HTTPRoutes accepted
kubectl get httproute -n dev

# End-to-end smoke test
GATEWAY_IP=$(kubectl get gateway saista-gateway -n dev \
  -o jsonpath='{.status.addresses[0].value}')

curl http://$GATEWAY_IP/api/users/health
# {"status":"healthy","service":"user-service","version":"2.0.0"}

curl http://$GATEWAY_IP/api/orders/health
curl http://$GATEWAY_IP/api/payment/health
curl http://$GATEWAY_IP/
# Returns React HTML
```

---

## Changes to make in your segregated repo folders

When you push these repos to GitHub, the only files that changed from the previous version are:

### saista-mysql-db repo
| File | Change |
|---|---|
| `k8s/storageclass.yaml` | Provisioner changed to `nfs.csi.k8s.io` with server IP `172.31.35.135` |
| `k8s/pv.yaml` | **DELETE this file** — not needed with CSI dynamic provisioning |
| `k8s/statefulset.yaml` | No change — already uses `storageClassName: nfs-storage` |

### All other repos (saista-user, saista-order, saista-payment, saista-frontend)
No changes needed — none of them reference the StorageClass directly.

---

## Troubleshooting

### PVC stuck in Pending
```bash
kubectl describe pvc mysql-data-mysql-0 -n dev
# If CSI driver not installed: provisioner nfs.csi.k8s.io not found
# Fix: re-run Step 3

# If NFS unreachable:
kubectl logs -n kube-system -l app=csi-nfs-controller
```

### Migration Job failed
```bash
kubectl logs -n dev job/db-migrate
# Re-run if needed:
kubectl delete job db-migrate -n dev
kubectl apply -f saista-user/k8s/migration-job.yaml
```

### Pod cannot mount NFS volume
```bash
# On the K8s node, check NFS is reachable:
showmount -e 172.31.35.135
# Port 2049 must be open on the NFS server's security group / firewall
```

### HTTPRoute not routing
```bash
kubectl describe httproute user-service-route -n dev
kubectl describe gateway saista-gateway -n dev
```
