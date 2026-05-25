# Helm Guide — Saista Bakers Umbrella Chart

---

## 1. What Is Helm and Why We Use It

Helm is a package manager for Kubernetes. Instead of running `kubectl apply` on 20+ separate YAML files one by one, Helm lets you deploy the entire Saista Bakers stack with a single command. It also lets you change values (like namespace or image tag) without editing every file manually.

**Without Helm** → you have 20+ static YAML files, and changing the namespace from `dev` to `prod` means editing every single file.

**With Helm** → you have templates with `{{ .Values.something }}` placeholders, and you just pass a different `values.yaml` file for each environment.

---

## 2. Our Chart Structure Explained

```
helm/
├── Chart.yaml              ← The umbrella chart identity card
├── values.yaml             ← ALL default values for every service
├── values-dev.yaml         ← Dev overrides (namespace: dev, 1 replica)
├── values-prod.yaml        ← Prod overrides (namespace: prod, 2 replicas)
└── charts/                 ← Sub-charts, one per service
    ├── mysql/
    │   ├── Chart.yaml
    │   ├── values.yaml
    │   └── templates/
    │       ├── namespace.yaml
    │       ├── storageclass.yaml
    │       ├── secret.yaml
    │       ├── configmap.yaml
    │       ├── statefulset.yaml
    │       └── gateway.yaml
    ├── user-service/
    │   ├── Chart.yaml
    │   ├── values.yaml
    │   └── templates/
    │       ├── configmap.yaml
    │       ├── secret.yaml
    │       ├── deployment.yaml
    │       ├── service.yaml
    │       ├── httproute.yaml
    │       ├── migration-configmap.yaml
    │       └── migration-job.yaml
    ├── order-service/
    ├── payment-service/
    └── frontend/
```

**Umbrella chart** = the parent `helm/` folder. It coordinates all sub-charts.
**Sub-chart** = each service folder inside `charts/`. Each is independent but shares global values.

---

## 3. How Values Flow — The Core Concept

This is the most important thing to understand. There are **three levels** of values:

```
helm/values.yaml          ← Level 1: umbrella defaults (everything lives here)
helm/values-dev.yaml      ← Level 2: environment overrides (merges ON TOP of Level 1)
charts/mysql/values.yaml  ← Level 3: sub-chart defaults (lowest priority, rarely changed)
```

When Helm runs, it merges all three levels. **Level 2 wins over Level 1, Level 1 wins over Level 3.**

### 3a. Global Values

In `helm/values.yaml` there is a special `global:` block:

```yaml
global:
  namespace: dev
  imageTag: latest
  db:
    user: root
    name: saista_bakers
    port: "3306"
  secrets:
    dbPassword: "Asad@1234"
    secretKey: "saista-bakers-super-secure-prod-key-2024"
    jwtSecret: "saista-bakers-super-secure-prod-key-2024"
```

The `global:` block is **special in Helm** — it is automatically passed down into every sub-chart. So inside any template (mysql, user-service, frontend etc.), you can access:

```yaml
{{ .Values.global.namespace }}      → "dev"
{{ .Values.global.imageTag }}       → "latest"
{{ .Values.global.db.user }}        → "root"
{{ .Values.global.secrets.dbPassword }} → "Asad@1234"
```

### 3b. Sub-Chart-Specific Values

Values that are NOT under `global:` belong only to that specific sub-chart.

In `helm/values.yaml`:
```yaml
user-service:          ← this block belongs to the user-service sub-chart
  replicaCount: 2
  image:
    repository: asadoblivion/saista-user-service
    pullPolicy: Always
  port: 5001
```

Inside `helm/charts/user-service/templates/deployment.yaml`, those values are accessed as:
```yaml
{{ .Values.replicaCount }}           → 2
{{ .Values.image.repository }}       → asadoblivion/saista-user-service
{{ .Values.port }}                   → 5001
```

**Notice:** inside the sub-chart template, you do NOT write `.Values.user-service.replicaCount`. The sub-chart sees its own values directly at `.Values.*`. The `user-service:` key in the umbrella `values.yaml` is the routing mechanism — Helm automatically strips it when passing values into the sub-chart.

### 3c. How Environment Overrides Work

`values-dev.yaml` only contains what is DIFFERENT from the defaults:

```yaml
# values-dev.yaml
global:
  namespace: dev
  imageTag: latest

user-service:
  replicaCount: 1    ← overrides the default of 2
```

When you run:
```bash
helm install saista-bakers ./helm -f helm/values-dev.yaml
```

Helm merges like this:
```
values.yaml default:    user-service.replicaCount = 2
values-dev.yaml says:   user-service.replicaCount = 1
Final result:           user-service.replicaCount = 1   ← dev wins
```

For prod:
```bash
helm install saista-bakers ./helm -f helm/values-prod.yaml
```
```
values.yaml default:    user-service.replicaCount = 2
values-prod.yaml says:  user-service.replicaCount = 2  (same, prod wants 2 replicas)
Final result:           user-service.replicaCount = 2
```

---

## 4. Template Syntax Cheat Sheet

| Syntax | What it does | Example output |
|--------|-------------|----------------|
| `{{ .Values.global.namespace }}` | Inserts a value | `dev` |
| `{{ .Values.port }}` | Sub-chart value | `5001` |
| `{{ .Values.image.repository }}:{{ .Values.global.imageTag }}` | Combines two values | `asadoblivion/saista-user-service:latest` |
| `{{ .Values.global.db.name \| quote }}` | Inserts value wrapped in quotes | `"saista_bakers"` |
| `mysql.{{ .Values.global.namespace }}.svc.cluster.local` | Builds a dynamic DNS name | `mysql.dev.svc.cluster.local` |

The last one is important: our inter-service URLs are built dynamically. When namespace is `dev`, MySQL is reachable at `mysql.dev.svc.cluster.local`. When namespace is `prod`, it becomes `mysql.prod.svc.cluster.local`. This is all automatic.

---

## 5. Concrete Mapping Example — user-service Deployment

**Template** (`helm/charts/user-service/templates/deployment.yaml`):
```yaml
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: user-service
          image: {{ .Values.image.repository }}:{{ .Values.global.imageTag }}
          ports:
            - containerPort: {{ .Values.port }}
```

**Values sources:**
| Template expression | Source file | Key path | Resolved value (dev) |
|---------------------|-------------|----------|----------------------|
| `.Values.replicaCount` | `values-dev.yaml` | `user-service.replicaCount` | `1` |
| `.Values.image.repository` | `values.yaml` | `user-service.image.repository` | `asadoblivion/saista-user-service` |
| `.Values.global.imageTag` | `values-dev.yaml` | `global.imageTag` | `latest` |
| `.Values.port` | `values.yaml` | `user-service.port` | `5001` |

**Rendered output** (what kubectl actually sees):
```yaml
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: user-service
          image: asadoblivion/saista-user-service:latest
          ports:
            - containerPort: 5001
```

---

## 6. Prerequisites on EC2

SSH into your EC2 instance and run these checks:

```bash
# Check kubectl is connected to your cluster
kubectl get nodes

# Check Helm is installed
helm version
# If not installed:
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Check Gateway API CRDs are installed (required before deploying)
kubectl get crd gateways.gateway.networking.k8s.io
# If not installed:
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Check kgateway controller is running
kubectl get pods -n kgateway-system
# If not installed, follow kgateway install docs for your cluster setup

# Check NFS CSI driver is installed
kubectl get pods -n kube-system | grep nfs
# If not installed:
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs --namespace kube-system
```

---

## 7. Lint and Dry-Run Before Deploying

**Always do this first** — it catches template errors without touching the cluster.

```bash
# Navigate to the project root
cd /path/to/_new-poly-repos

# 1. Lint — checks for syntax errors in all templates
helm lint ./helm -f helm/values-dev.yaml

# 2. Template render — prints what YAML Helm would generate (does NOT apply anything)
helm template saista-bakers ./helm -f helm/values-dev.yaml

# 3. Dry run — simulates the install against the real cluster API (validates resources)
helm install saista-bakers ./helm -f helm/values-dev.yaml --dry-run --debug
```

If the dry-run output looks correct, you are ready to deploy.

---

## 8. Deploy to Dev

```bash
# Install (first time)
helm install saista-bakers ./helm -f helm/values-dev.yaml

# Check the release was created
helm list

# Watch all pods come up
kubectl get pods -n dev -w

# Check all services
kubectl get svc -n dev

# Check HTTPRoutes (Gateway API routing)
kubectl get httproutes -n dev

# Check Gateway
kubectl get gateway -n dev
```

Expected pod status sequence: `Init → Running`. The migration job (`db-migrate`) will run first (it has an initContainer waiting for MySQL), then the service deployments will start.

---

## 9. Deploy to Prod

```bash
# Prod uses a DIFFERENT Helm release name so dev and prod coexist
helm install saista-bakers-prod ./helm -f helm/values-prod.yaml

# Check prod pods
kubectl get pods -n prod -w
```

---

## 10. Upgrade (After Code Changes)

When you push a new Docker image and want to update the running deployment:

```bash
# Upgrade with a new image tag
helm upgrade saista-bakers ./helm -f helm/values-dev.yaml --set global.imageTag=v1.2.3

# Or just re-apply the same values (picks up any template changes)
helm upgrade saista-bakers ./helm -f helm/values-dev.yaml
```

Helm tracks revision history. You can rollback if something breaks:
```bash
# See upgrade history
helm history saista-bakers

# Rollback to previous version
helm rollback saista-bakers 1
```

---

## 11. Uninstall

```bash
# Remove everything deployed by the dev release
helm uninstall saista-bakers

# Remove prod release
helm uninstall saista-bakers-prod

# Note: the Namespace and StorageClass are NOT deleted automatically
# (Helm doesn't delete cluster-scoped resources by default)
# To fully clean up:
kubectl delete namespace dev
kubectl delete storageclass nfs-storage
```

---

## 12. Useful Debug Commands

```bash
# See full rendered YAML for just one sub-chart (mysql)
helm template saista-bakers ./helm -f helm/values-dev.yaml --show-only charts/mysql/templates/statefulset.yaml

# See what values Helm is actually using for a live release
helm get values saista-bakers

# See all resources Helm deployed
helm get manifest saista-bakers

# Check if migration job succeeded
kubectl get jobs -n dev
kubectl logs job/db-migrate -n dev

# Check MySQL is running
kubectl get pods -n dev -l app=mysql
kubectl logs -n dev statefulset/mysql

# Check a service's logs
kubectl logs -n dev deployment/user-service
kubectl logs -n dev deployment/order-service
kubectl logs -n dev deployment/payment-service
kubectl logs -n dev deployment/frontend
```

---

## 13. How This Deploys in Order

Helm does not guarantee resource creation order, but Kubernetes itself handles dependencies:

1. **Namespace** (`mysql` sub-chart) — created first because everything else needs it
2. **StorageClass** — cluster-scoped, created immediately
3. **Gateway + GatewayClass** — cluster-scoped, created immediately
4. **MySQL StatefulSet** — starts pulling the image and provisioning NFS volume
5. **Migration Job** — its `initContainer` blocks until MySQL port 3306 is open, so it automatically waits
6. **Service Deployments** — user, order, payment, frontend start in parallel

The migration job finishing before the services matter is handled by the `nc -z mysql...` wait loop in the initContainer — not by Helm ordering.

---

## 14. Summary — The One-Line Mental Model

```
values-dev.yaml  +  values.yaml  →  Helm merges them  →  fills in {{ .Values.* }}  →  sends final YAML to kubectl
```

Change environment = swap the `-f` file. Change image = `--set global.imageTag=X`. Everything else is automatic.
