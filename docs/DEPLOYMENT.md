# Deployment Guide

This guide covers all deployment options for the Use Next Ship application, from local development to production Kubernetes deployments.

## Table of Contents

- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Platform Deployments](#platform-deployments)
- [Environment Configuration](#environment-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Local Development

### Prerequisites

1. Install Nix package manager
2. Install devenv
3. Install direnv
4. Clone the repository

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/danilomartinelli/use-next-ship.git
cd use-next-ship

# 2. Allow direnv to load environment
direnv allow

# 3. Start all services (PostgreSQL, Redis)
devenv up

# 4. Install dependencies
pnpm install

# 5. Setup database
pnpm db:push

# 6. Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`

## Docker Deployment

### Building the Docker Image

```bash
# Build with specific commit SHA
make build-docker-image SHORT_SHA=$(git rev-parse --short HEAD)

# Or build directly with Docker
docker build -t use-next-ship:latest .
```

### Running with Docker

```bash
# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/db" \
  -e BETTER_AUTH_SECRET="your-secret" \
  -e NEXT_PUBLIC_BASE_URL="http://localhost:3000" \
  use-next-ship:latest
```

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/nextship
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      NEXT_PUBLIC_BASE_URL: http://localhost:3000
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: nextship
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Run with:

```bash
docker-compose up -d
```

## Kubernetes Deployment

### Prerequisites

1. Kubernetes cluster (1.24+)
2. kubectl configured
3. Helm 3 installed
4. SOPS for secrets management

### Helm Chart Structure

```text
chart/
├── Chart.yaml           # Chart metadata
├── values.yaml          # Default values
├── templates/
│   ├── deployment.yaml  # Application deployment
│   ├── service.yaml     # Kubernetes service
│   ├── ingress.yaml     # Ingress configuration
│   ├── configmap.yaml   # Configuration
│   └── secret.yaml      # Encrypted secrets
└── values/
    ├── staging.yaml     # Staging overrides
    └── production.yaml  # Production overrides
```

### Deployment Steps

#### 1. Prepare Secrets

```bash
# Generate age key for SOPS
age-keygen -o age-key.txt

# Encrypt secrets
sops -e chart/values/production/secrets.yaml > chart/values/production/secrets.enc.yaml
```

#### 2. Deploy with Helm

```bash
# Add Helm repository (if using remote chart)
helm repo add use-next-ship https://charts.example.com
helm repo update

# Deploy to staging
make deploy \
  IMAGE_TAG=v1.0.0 \
  ENVIRONMENT=staging \
  NAMESPACE=staging \
  KUBECONFIG=~/.kube/config

# Deploy to production
make deploy \
  IMAGE_TAG=v1.0.0 \
  ENVIRONMENT=production \
  NAMESPACE=production \
  KUBECONFIG=~/.kube/config
```

#### 3. Manual Helm Deployment

```bash
# Create namespace
kubectl create namespace production

# Deploy with Helm
helm upgrade --install use-next-ship ./chart \
  --namespace production \
  --values chart/values.yaml \
  --values chart/values/production.yaml \
  --set image.tag=v1.0.0 \
  --set ingress.hosts[0].host=app.example.com
```

### Kubernetes Resources

#### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: use-next-ship
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: app
        image: use-next-ship:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /healthz
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

#### Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: use-next-ship
spec:
  selector:
    app: use-next-ship
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

#### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: use-next-ship
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: use-next-ship
            port:
              number: 80
```

### Scaling

#### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: use-next-ship-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: use-next-ship
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Platform Deployments

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

Environment variables to set in Vercel dashboard:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_BASE_URL`

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Render

1. Connect GitHub repository
2. Choose "Web Service"
3. Set build command: `pnpm build`
4. Set start command: `pnpm start`
5. Add environment variables

## Environment Configuration

### Development Environment

```env
# .env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/nextship
BETTER_AUTH_SECRET=dev-secret-change-in-production
NEXT_PUBLIC_BASE_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

### Staging Environment

```env
# .env.staging
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/nextship
BETTER_AUTH_SECRET=${STAGING_AUTH_SECRET}
BETTER_AUTH_URL=https://staging.example.com
NEXT_PUBLIC_BASE_URL=https://staging.example.com
REDIS_URL=redis://staging-redis.example.com:6379
```

### Production Environment

```env
# .env.production
DATABASE_URL=${PRODUCTION_DATABASE_URL}
BETTER_AUTH_SECRET=${PRODUCTION_AUTH_SECRET}
BETTER_AUTH_URL=https://app.example.com
NEXT_PUBLIC_BASE_URL=https://app.example.com
REDIS_URL=${PRODUCTION_REDIS_URL}
```

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline automatically:

1. Runs tests and linting
2. Builds Docker image
3. Pushes to container registry
4. Deploys to Kubernetes

#### Required GitHub Secrets

**Repository Secrets:**

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `AGE_KEY_FILE` (for SOPS decryption)

**Environment Secrets (per environment):**

- `KUBECONFIG_YAML`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`

### Manual Deployment

```bash
# Trigger deployment manually
gh workflow run deploy.yml \
  -f environment=production \
  -f image_tag=v1.0.0
```

## Monitoring & Maintenance

### Health Checks

The application exposes health endpoints:

```bash
# Liveness check
curl https://app.example.com/healthz

# Readiness check (checks database)
curl https://app.example.com/api/health/ready
```

### Logging

#### Application Logs

```bash
# View Kubernetes logs
kubectl logs -n production deployment/use-next-ship

# Follow logs
kubectl logs -n production deployment/use-next-ship -f

# View specific pod logs
kubectl logs -n production use-next-ship-xxxxx
```

#### Structured Logging

Configure structured logging for production:

```typescript
// src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
})
```

### Database Migrations

#### Running Migrations

```bash
# Generate migration
pnpm db:generate

# Apply migration in production
kubectl exec -n production deployment/use-next-ship -- pnpm db:migrate
```

#### Rollback Strategy

```bash
# Create backup before migration
pg_dump $DATABASE_URL > backup.sql

# Rollback if needed
psql $DATABASE_URL < backup.sql
```

### Backup Strategy

#### Database Backups

```bash
# Automated daily backups
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - sh
            - -c
            - |
              pg_dump $DATABASE_URL | gzip > /backup/db-$(date +%Y%m%d).sql.gz
          restartPolicy: OnFailure
EOF
```

### Performance Monitoring

#### Metrics to Track

1. **Application Metrics**
   - Response time (p50, p95, p99)
   - Error rate
   - Request rate

2. **Infrastructure Metrics**
   - CPU utilization
   - Memory usage
   - Pod restart count

3. **Business Metrics**
   - Active users
   - Sign-up rate
   - API usage

#### Monitoring Tools

- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Sentry**: Error tracking
- **New Relic / Datadog**: APM

### Troubleshooting

#### Common Issues

**Pod Crashes**

```bash
# Check pod status
kubectl get pods -n production

# Describe pod for events
kubectl describe pod use-next-ship-xxxxx -n production

# Check resource limits
kubectl top pods -n production
```

**Database Connection Issues**

```bash
# Test connection from pod
kubectl exec -it deployment/use-next-ship -n production -- \
  psql $DATABASE_URL -c "SELECT 1"
```

**High Memory Usage**

```bash
# Check memory usage
kubectl top pods -n production

# Increase limits if needed
kubectl set resources deployment/use-next-ship \
  --limits=memory=1Gi -n production
```

### Maintenance Mode

Enable maintenance mode during updates:

```bash
# Scale down to 0
kubectl scale deployment/use-next-ship --replicas=0 -n production

# Perform maintenance
# ...

# Scale back up
kubectl scale deployment/use-next-ship --replicas=3 -n production
```

## Security Considerations

### SSL/TLS Configuration

- Use cert-manager for automatic certificate renewal
- Enforce HTTPS redirect at ingress level
- Configure HSTS headers

### Secret Rotation

```bash
# Rotate secrets quarterly
# 1. Generate new secret
openssl rand -hex 32

# 2. Update in Kubernetes
kubectl create secret generic app-secrets \
  --from-literal=auth-secret=new-secret \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Restart pods
kubectl rollout restart deployment/use-next-ship -n production
```

### Security Headers

Configure security headers in Next.js:

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
]
```

## Disaster Recovery

### Backup Procedures

1. **Database**: Daily automated backups to S3
2. **Secrets**: Encrypted backups with SOPS
3. **Configuration**: Version controlled in Git

### Recovery Plan

1. **Data Loss**: Restore from latest backup
2. **Service Outage**: Failover to standby region
3. **Security Breach**: Rotate all secrets, audit logs

### RTO and RPO Targets

- **RTO** (Recovery Time Objective): < 1 hour
- **RPO** (Recovery Point Objective): < 24 hours
