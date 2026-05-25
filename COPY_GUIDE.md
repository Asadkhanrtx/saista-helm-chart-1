# Poly-Repo Segregation — Migration Map

All generated files are in `_new-poly-repos/`. Copy them into their own repos as shown.

---

## STEP 0 — Apply infrastructure first (saista-mysql-db repo)

This repo has NO src/. It is pure Kubernetes manifests.

```
saista-mysql-db/
└── k8s/
    ├── namespace.yaml       ← apply FIRST
    ├── secret.yaml
    ├── configmap.yaml
    ├── storageclass.yaml    ← apply before PV
    ├── pv.yaml              ← EDIT <YOUR-NODE-NAME> before applying
    ├── statefulset.yaml     ← includes the headless Service
    ├── gatewayclass.yaml    ← EDIT controllerName for your Gateway impl
    └── gateway.yaml
```

### Apply order:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/storageclass.yaml
kubectl apply -f k8s/pv.yaml           # Edit node name first!
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/statefulset.yaml
kubectl apply -f k8s/gatewayclass.yaml  # Edit controllerName first!
kubectl apply -f k8s/gateway.yaml
```

---

## STEP 1 — saista-user repo

### Files to COPY from monorepo into src/:
| From (monorepo)                     | To (new repo)           |
|-------------------------------------|-------------------------|
| `user-service/app/`                 | `src/app/`              |
| `user-service/requirements.txt`     | `src/requirements.txt`  |
| `user-service/migrate_db.py`        | `src/migrate_db.py`     |

### Files from _new-poly-repos/saista-user/ (already generated):
| File                                | Destination             |
|-------------------------------------|-------------------------|
| `Dockerfile`                        | `Dockerfile`            |
| `.dockerignore`                     | `.dockerignore`         |
| `src/entrypoint.sh`                 | `src/entrypoint.sh`     |
| `k8s/configmap.yaml`                | `k8s/configmap.yaml`    |
| `k8s/secret.yaml`                   | `k8s/secret.yaml`       |
| `k8s/deployment.yaml`               | `k8s/deployment.yaml`   |
| `k8s/service.yaml`                  | `k8s/service.yaml`      |
| `k8s/httproute.yaml`                | `k8s/httproute.yaml`    |

### Final structure:
```
saista-user/
├── src/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── products.py
│   │       └── admin.py
│   ├── requirements.txt
│   ├── migrate_db.py        ← DB schema owner
│   └── entrypoint.sh        ← runs migrate then uvicorn
├── k8s/
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── httproute.yaml       ← /api/users → user-service:5001
├── Dockerfile
└── .dockerignore
```

### Deploy:
```bash
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/httproute.yaml
```

---

## STEP 2 — saista-order repo

### Files to COPY from monorepo into src/:
| From (monorepo)                     | To (new repo)           |
|-------------------------------------|-------------------------|
| `order-service/app/`                | `src/app/`              |
| `order-service/requirements.txt`    | `src/requirements.txt`  |

### Files from _new-poly-repos/saista-order/:
| File                                | Destination             |
|-------------------------------------|-------------------------|
| `Dockerfile`                        | `Dockerfile`            |
| `.dockerignore`                     | `.dockerignore`         |
| `k8s/configmap.yaml`                | `k8s/configmap.yaml`    |
| `k8s/secret.yaml`                   | `k8s/secret.yaml`       |
| `k8s/deployment.yaml`               | `k8s/deployment.yaml`   |
| `k8s/service.yaml`                  | `k8s/service.yaml`      |
| `k8s/httproute.yaml`                | `k8s/httproute.yaml`    |

### Final structure:
```
saista-order/
├── src/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── routes/
│   │       ├── cart.py
│   │       ├── orders.py
│   │       └── custom.py
│   └── requirements.txt
├── k8s/
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── httproute.yaml       ← /api/orders → order-service:5002
├── Dockerfile
└── .dockerignore
```

---

## STEP 3 — saista-payment repo

### Files to COPY from monorepo into src/:
| From (monorepo)                     | To (new repo)           |
|-------------------------------------|-------------------------|
| `payment-service/app/`              | `src/app/`              |
| `payment-service/requirements.txt`  | `src/requirements.txt`  |

### Files from _new-poly-repos/saista-payment/:
Same pattern as order — Dockerfile, .dockerignore, k8s/*.yaml

### Final structure:
```
saista-payment/
├── src/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── routes/
│   │       └── payment.py
│   └── requirements.txt
├── k8s/
│   ├── configmap.yaml       ← includes SMTP, ORDER_SERVICE_URL, USER_SERVICE_URL
│   ├── secret.yaml          ← includes SMTP_PASSWORD
│   ├── deployment.yaml
│   ├── service.yaml
│   └── httproute.yaml       ← /api/payment → payment-service:5003
├── Dockerfile
└── .dockerignore
```

---

## STEP 4 — saista-frontend repo

### Files to COPY from monorepo into src/:
| From (monorepo)                     | To (new repo)           |
|-------------------------------------|-------------------------|
| `frontend/src/`                     | `src/src/`              |
| `frontend/public/`                  | `src/public/`           |
| `frontend/package.json`             | `src/package.json`      |
| `frontend/package-lock.json`        | `src/package-lock.json` |

### Files from _new-poly-repos/saista-frontend/:
| File                                | Destination             |
|-------------------------------------|-------------------------|
| `Dockerfile`                        | `Dockerfile`            |
| `.dockerignore`                     | `.dockerignore`         |
| `src/nginx.conf`                    | `src/nginx.conf`        |
| `k8s/deployment.yaml`               | `k8s/deployment.yaml`   |
| `k8s/service.yaml`                  | `k8s/service.yaml`      |
| `k8s/httproute.yaml`                | `k8s/httproute.yaml`    |

### Final structure:
```
saista-frontend/
├── src/
│   ├── src/                 ← React source code
│   ├── public/
│   │   └── images/
│   │       └── gallery/     ← product images (baked into Docker image)
│   │           ├── img1.jpeg
│   │           ├── strawberry.png
│   │           ├── vanilla.png
│   │           └── cookies.png
│   ├── package.json
│   ├── package-lock.json
│   └── nginx.conf           ← SPA-only; no proxy needed (Gateway handles /api/*)
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── httproute.yaml       ← / (catch-all) → frontend:80
├── Dockerfile
└── .dockerignore
```

---

## Traffic flow with Gateway API

```
Browser
  │
  ▼
Gateway (port 80, LoadBalancer IP)
  │
  ├── /api/users/*   ──► user-service:5001   (HTTPRoute strips prefix → /)
  ├── /api/orders/*  ──► order-service:5002  (HTTPRoute strips prefix → /)
  ├── /api/payment/* ──► payment-service:5003 (HTTPRoute strips prefix → /)
  └── /*             ──► frontend:80          (React SPA + Nginx)
```

HTTPRoute order matters — the service-specific paths (/api/*) are declared in
their own repos and match before the catch-all frontend route.

---

## Build & push Docker images (after copying files)

```bash
# In each repo root:
docker build -t asadoblivion/saista-user-service:latest .
docker push asadoblivion/saista-user-service:latest

docker build -t asadoblivion/saista-order-service:latest .
docker push asadoblivion/saista-order-service:latest

docker build -t asadoblivion/saista-payment-service:latest .
docker push asadoblivion/saista-payment-service:latest

docker build -t asadoblivion/saista-frontend:latest .
docker push asadoblivion/saista-frontend:latest
```
