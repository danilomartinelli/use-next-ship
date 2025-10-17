# Troubleshooting Guide

## Common Issues and Solutions

This guide covers common problems you might encounter while working with Use Next Ship and their solutions.

## Table of Contents

- [Development Environment Issues](#development-environment-issues)
- [Build and Compilation Errors](#build-and-compilation-errors)
- [Database Issues](#database-issues)
- [Authentication Problems](#authentication-problems)
- [Docker and Containerization](#docker-and-containerization)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Performance Issues](#performance-issues)
- [Testing Issues](#testing-issues)
- [Common Error Messages](#common-error-messages)

## Development Environment Issues

### Nix/devenv Setup Problems

#### Problem: `direnv: error .envrc is blocked`

**Solution:**

```bash
direnv allow
```

#### Problem: Nix packages not installing

**Solution:**

```bash
# Clear Nix store cache
nix-collect-garbage -d

# Rebuild environment
devenv shell --impure

# If still failing, check Nix configuration
nix-doctor
```

#### Problem: PostgreSQL not starting in devenv

**Solution:**

```bash
# Check if PostgreSQL is already running
lsof -i :5432

# Kill existing process if needed
kill -9 <PID>

# Restart devenv services
devenv down
devenv up
```

### Node.js and Package Manager Issues

#### Problem: `pnpm: command not found`

**Solution:**

```bash
# Install pnpm globally
npm install -g pnpm@10.11.0

# Or use Corepack
corepack enable
corepack prepare pnpm@10.11.0 --activate
```

#### Problem: Package version conflicts

**Solution:**

```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and lockfile
rm -rf node_modules pnpm-lock.yaml

# Reinstall dependencies
pnpm install
```

#### Problem: `EACCES` permission errors

**Solution:**

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use a Node version manager
nvm use 22
```

## Build and Compilation Errors

### TypeScript Errors

#### Problem: Type errors during build

**Solution:**

```bash
# Check for type errors
pnpm typecheck

# Common fixes:
# 1. Update type definitions
pnpm add -D @types/node@latest

# 2. Clear TypeScript cache
rm -rf .next tsconfig.tsbuildinfo

# 3. Restart TypeScript server in VSCode
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

#### Problem: `Cannot find module '@/...'` errors

**Solution:**

```typescript
// Check tsconfig.json paths configuration
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Next.js Build Issues

#### Problem: Build fails with memory errors

**Solution:**

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# Or set in package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

#### Problem: `Module not found` errors in production

**Solution:**

```bash
# Ensure all dependencies are correctly categorized
# Move runtime dependencies from devDependencies
pnpm add <package-name>
pnpm remove -D <package-name>

# Clear Next.js cache
rm -rf .next
pnpm build
```

#### Problem: Static generation timeout

**Solution:**

```javascript
// Increase timeout in next.config.js
module.exports = {
  staticPageGenerationTimeout: 120, // seconds
};
```

## Database Issues

### Connection Problems

#### Problem: `ECONNREFUSED` connecting to PostgreSQL

**Solution:**

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# If using Docker
docker ps | grep postgres
docker start postgres-container

# If using devenv
devenv up

# Check connection string
echo $DATABASE_URL
# Should be: postgresql://user:password@localhost:5432/dbname
```

#### Problem: `password authentication failed`

**Solution:**

```bash
# Update .env.local with correct credentials
DATABASE_URL="postgresql://postgres:password@localhost:5432/nextship"

# Reset PostgreSQL password
psql -U postgres -c "ALTER USER postgres PASSWORD 'newpassword';"
```

### Migration Issues

#### Problem: Migrations failing

**Solution:**

```bash
# Generate fresh migration
pnpm db:generate

# Apply migrations manually
pnpm db:migrate

# If corrupted, reset database (WARNING: Data loss)
pnpm db:push --force-reset
```

#### Problem: Schema out of sync

**Solution:**

```bash
# Pull current database state
pnpm drizzle-kit introspect

# Compare with schema
diff drizzle/schema.ts drizzle/introspected.ts

# Generate migration for differences
pnpm db:generate
pnpm db:migrate
```

### Drizzle ORM Issues

#### Problem: Type errors after schema changes

**Solution:**

```bash
# Regenerate Drizzle types
pnpm db:generate

# Restart TypeScript server
# In VSCode: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

## Authentication Problems

### BetterAuth Issues

#### Problem: `BETTER_AUTH_SECRET` not set

**Solution:**

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
BETTER_AUTH_SECRET="your-generated-secret"

# Never commit secrets to git
echo ".env.local" >> .gitignore
```

#### Problem: Session not persisting

**Solution:**

```typescript
// Check cookie settings in auth config
export const auth = betterAuth({
  database: {
    provider: "postgresql",
    url: process.env.DATABASE_URL,
  },
  session: {
    cookieName: "session",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
```

#### Problem: OAuth providers not working

**Solution:**

```bash
# Ensure callback URLs are configured correctly
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Callback URL format:
# http://localhost:3000/api/auth/callback/google
```

## Docker and Containerization

### Build Issues

#### Problem: Docker build fails with `pnpm not found`

**Solution:**

```dockerfile
# Ensure pnpm is installed in Dockerfile
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
```

#### Problem: Large Docker image size

**Solution:**

```dockerfile
# Use multi-stage build
FROM node:22-alpine AS deps
# Install dependencies only

FROM node:22-alpine AS builder
# Build application

FROM node:22-alpine AS runner
# Copy only necessary files
```

### Runtime Issues

#### Problem: Container can't connect to database

**Solution:**

```yaml
# docker-compose.yml - Use service names for internal communication
services:
  app:
    environment:
      DATABASE_URL: "postgresql://postgres:password@db:5432/nextship"
    depends_on:
      - db

  db:
    image: postgres:16-alpine
```

#### Problem: Container exits immediately

**Solution:**

```bash
# Check logs
docker logs <container-id>

# Common fixes:
# 1. Ensure CMD is correct in Dockerfile
CMD ["pnpm", "start"]

# 2. Check port binding
docker run -p 3000:3000 <image>

# 3. Debug with shell
docker run -it <image> sh
```

## Kubernetes Deployment

### Pod Issues

#### Problem: Pods stuck in `CrashLoopBackOff`

**Solution:**

```bash
# Check pod logs
kubectl logs <pod-name> -n <namespace>

# Describe pod for events
kubectl describe pod <pod-name> -n <namespace>

# Common causes:
# 1. Missing environment variables
# 2. Database connection failures
# 3. Resource limits too low

# Increase resources if needed
kubectl set resources deployment/use-next-ship \
  --limits=memory=1Gi,cpu=500m \
  --requests=memory=512Mi,cpu=200m
```

#### Problem: Pods not starting - `ImagePullBackOff`

**Solution:**

```bash
# Check image name and tag
kubectl describe pod <pod-name> | grep Image

# Verify registry credentials
kubectl get secret regcred -o yaml

# Create registry secret if missing
kubectl create secret docker-registry regcred \
  --docker-server=<registry-url> \
  --docker-username=<username> \
  --docker-password=<password>
```

### Service Issues

#### Problem: Service not accessible

**Solution:**

```bash
# Check service endpoints
kubectl get endpoints <service-name>

# Verify service selector matches pod labels
kubectl get svc <service-name> -o yaml | grep selector
kubectl get pods --show-labels

# Test service from within cluster
kubectl run test --rm -it --image=alpine -- sh
wget -qO- http://<service-name>.<namespace>.svc.cluster.local
```

### Ingress Issues

#### Problem: SSL/TLS certificate errors

**Solution:**

```bash
# Check cert-manager status
kubectl get certificates -A

# Check certificate details
kubectl describe certificate <cert-name>

# Force certificate renewal
kubectl delete secret <tls-secret-name>
kubectl delete certificate <cert-name>
```

## Performance Issues

### Slow Page Loads

#### Problem: Initial page load is slow

**Solution:**

```javascript
// 1. Enable ISR (Incremental Static Regeneration)
export const revalidate = 60; // seconds

// 2. Optimize images
import Image from 'next/image';

// 3. Use dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
});
```

### Memory Leaks

#### Problem: Memory usage increases over time

**Solution:**

```javascript
// 1. Clean up event listeners
useEffect(() => {
  const handler = () => {};
  window.addEventListener('resize', handler);

  return () => {
    window.removeEventListener('resize', handler);
  };
}, []);

// 2. Cancel async operations
useEffect(() => {
  const abortController = new AbortController();

  fetch('/api/data', { signal: abortController.signal })
    .then(/* ... */);

  return () => {
    abortController.abort();
  };
}, []);
```

### Database Query Performance

#### Problem: Slow database queries

**Solution:**

```typescript
// 1. Add indexes
await db.execute(sql`
  CREATE INDEX idx_users_email ON users(email);
`);

// 2. Use select specific columns
const users = await db
  .select({
    id: users.id,
    name: users.name,
  })
  .from(users); // Don't select all columns

// 3. Implement pagination
const results = await db
  .select()
  .from(users)
  .limit(10)
  .offset(page * 10);
```

## Testing Issues

### Test Database Problems

#### Problem: Tests failing with database errors

**Solution:**

```bash
# Ensure test database exists
createdb nextship_test

# Update test environment
TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/nextship_test"

# Run test setup
pnpm test:setup
```

#### Problem: Tests not rolling back transactions

**Solution:**

```typescript
// vitest.config.ts
export default {
  test: {
    poolOptions: {
      beforeEach: async () => {
        await db.execute(sql`BEGIN`);
      },
      afterEach: async () => {
        await db.execute(sql`ROLLBACK`);
      },
    },
  },
};
```

### Test Execution Issues

#### Problem: Tests timing out

**Solution:**

```typescript
// Increase test timeout
test('slow operation', async () => {
  // Test code
}, 30000); // 30 seconds

// Or globally in vitest.config.ts
export default {
  test: {
    testTimeout: 30000,
  },
};
```

## Common Error Messages

### `EADDRINUSE: address already in use`

**Solution:**

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

### `Module parse failed: Unexpected token`

**Solution:**

```javascript
// Check next.config.js for proper configuration
module.exports = {
  transpilePackages: ['package-name'],
};
```

### `Hydration failed because the initial UI does not match`

**Solution:**

```typescript
// 1. Ensure consistent rendering
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;

// 2. Use suppressHydrationWarning for dynamic content
<div suppressHydrationWarning>
  {new Date().toLocaleString()}
</div>
```

### `Failed to compile: Cannot read properties of undefined`

**Solution:**

```bash
# Clear all caches
rm -rf .next node_modules
pnpm install
pnpm dev
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs**:
   - Browser console: F12 → Console tab
   - Server logs: Terminal output or `docker logs`
   - Build logs: CI/CD pipeline output

2. **Search existing issues**:
   - [GitHub Issues](https://github.com/danilomartinelli/use-next-ship/issues)
   - [Stack Overflow](https://stackoverflow.com)

3. **Create a detailed bug report**:
   - Environment details (OS, Node version, etc.)
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and logs
   - Code snippets if relevant

4. **Community resources**:
   - [Next.js Discord](https://nextjs.org/discord)
   - [Drizzle Discord](https://discord.gg/drizzle)
   - [BetterAuth Discord](https://discord.gg/better-auth)

## Debugging Tips

### Enable Verbose Logging

```bash
# Next.js debug mode
DEBUG=* pnpm dev

# Database query logging
DRIZZLE_LOG=true pnpm dev

# Node.js debugging
NODE_OPTIONS='--inspect' pnpm dev
```

### Use Chrome DevTools

```bash
# Start with debugging
pnpm dev --inspect

# Open Chrome
chrome://inspect

# Click "inspect" on your Node.js process
```

### Performance Profiling

```bash
# Build with profiling
ANALYZE=true pnpm build

# Generate performance report
npx next build --profile

# View bundle analyzer
npx next-bundle-analyzer
```
