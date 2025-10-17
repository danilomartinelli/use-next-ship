# Security Best Practices

This document outlines security best practices and guidelines for developing and deploying applications with Use Next Ship.

## Table of Contents

- [Security Principles](#security-principles)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [Input Validation & Sanitization](#input-validation--sanitization)
- [API Security](#api-security)
- [Database Security](#database-security)
- [Environment Variables & Secrets](#environment-variables--secrets)
- [Network Security](#network-security)
- [Dependency Management](#dependency-management)
- [Container Security](#container-security)
- [Kubernetes Security](#kubernetes-security)
- [Security Monitoring](#security-monitoring)
- [Incident Response](#incident-response)
- [Security Checklist](#security-checklist)

## Security Principles

### Defense in Depth

Implement multiple layers of security controls:

1. **Network Layer**: Firewalls, VPNs, network segmentation
2. **Application Layer**: Authentication, authorization, input validation
3. **Data Layer**: Encryption, access controls, backups
4. **Physical Layer**: Secure data centers, access controls

### Least Privilege

Grant minimum necessary permissions:

```typescript
// Bad - overly permissive
const user = { role: "admin", permissions: ["*"] };

// Good - specific permissions
const user = {
  role: "editor",
  permissions: ["read:posts", "write:posts", "update:own-posts"],
};
```

### Zero Trust

Never trust, always verify:

```typescript
// Always validate, even for authenticated users
export async function getUser(userId: string, requesterId: string) {
  // Verify requester has permission to access this user
  if (!canAccessUser(requesterId, userId)) {
    throw new UnauthorizedError();
  }

  return fetchUser(userId);
}
```

## Authentication & Authorization

### Secure Authentication Setup

#### Password Requirements

```typescript
// lib/auth/password-validation.ts
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[a-z]/, "Password must contain lowercase letter")
  .regex(/[0-9]/, "Password must contain number")
  .regex(/[^A-Za-z0-9]/, "Password must contain special character");

// Check for common passwords
const commonPasswords = new Set(["password123", "admin123", /* ... */]);

export function validatePassword(password: string): boolean {
  if (commonPasswords.has(password.toLowerCase())) {
    throw new Error("Password is too common");
  }

  return passwordSchema.parse(password);
}
```

#### Secure Session Management

```typescript
// server/auth/index.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    provider: "postgresql",
    url: process.env.DATABASE_URL!,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session if older than 1 day
    cookieOptions: {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === "production", // HTTPS only
      sameSite: "lax", // CSRF protection
      path: "/",
    },
  },
  // Account lockout after failed attempts
  rateLimit: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
  },
});
```

#### Multi-Factor Authentication (MFA)

```typescript
// Future implementation
import { authenticator } from "otplib";

export async function enableMFA(userId: string) {
  const secret = authenticator.generateSecret();

  // Store encrypted secret
  await db.update(users).set({
    mfaSecret: encrypt(secret),
    mfaEnabled: false, // Enable after verification
  }).where(eq(users.id, userId));

  const qrCode = authenticator.keyuri(
    user.email,
    "Use Next Ship",
    secret
  );

  return { secret, qrCode };
}

export async function verifyMFA(userId: string, token: string) {
  const user = await getUser(userId);
  const secret = decrypt(user.mfaSecret);

  return authenticator.verify({
    token,
    secret,
  });
}
```

### Authorization Patterns

#### Role-Based Access Control (RBAC)

```typescript
// lib/auth/rbac.ts
type Role = "admin" | "member" | "guest";
type Permission = "read" | "write" | "delete";
type Resource = "user" | "post" | "comment";

const rolePermissions: Record<Role, Set<`${Permission}:${Resource}`>> = {
  admin: new Set(["read:user", "write:user", "delete:user", /* all */]),
  member: new Set(["read:user", "write:post", "write:comment"]),
  guest: new Set(["read:post", "read:comment"]),
};

export function hasPermission(
  role: Role,
  permission: Permission,
  resource: Resource
): boolean {
  return rolePermissions[role].has(`${permission}:${resource}`);
}

// Usage in API route
export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!hasPermission(session.user.role, "delete", "user")) {
    return new Response("Forbidden", { status: 403 });
  }

  // Proceed with deletion
}
```

## Data Protection

### Encryption at Rest

```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const algorithm = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

### Personal Data Handling

```typescript
// GDPR compliance
export async function deleteUserData(userId: string) {
  // Start transaction
  await db.transaction(async (tx) => {
    // Anonymize instead of delete for audit trail
    await tx.update(users).set({
      email: `deleted-${userId}@example.com`,
      name: "Deleted User",
      personalData: null,
      deletedAt: new Date(),
    }).where(eq(users.id, userId));

    // Delete associated data
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
  });

  // Log for compliance
  await auditLog("USER_DATA_DELETED", { userId });
}
```

## Input Validation & Sanitization

### Never Trust User Input

```typescript
// lib/validation.ts
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

// SQL injection prevention through parameterized queries
export async function getUser(email: string) {
  // Validate input first
  const validEmail = z.string().email().parse(email);

  // Drizzle ORM prevents SQL injection
  return db.select().from(users).where(eq(users.email, validEmail));
}

// XSS prevention
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a"],
    ALLOWED_ATTR: ["href"],
  });
}

// Path traversal prevention
export function sanitizePath(path: string): string {
  // Remove any directory traversal attempts
  return path.replace(/\.\./g, "").replace(/[^a-zA-Z0-9-_\/]/g, "");
}
```

### File Upload Security

```typescript
// lib/upload-validation.ts
import { z } from "zod";
import sharp from "sharp";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function validateUpload(file: File) {
  // Check file size
  if (file.size > MAX_SIZE) {
    throw new Error("File too large");
  }

  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type");
  }

  // Verify actual file content (not just extension)
  const buffer = await file.arrayBuffer();
  const metadata = await sharp(buffer).metadata();

  if (!metadata.format) {
    throw new Error("Invalid image file");
  }

  // Sanitize filename
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 255);

  return {
    buffer,
    metadata,
    sanitizedName,
  };
}
```

## API Security

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
});

export async function rateLimitMiddleware(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(reset).toISOString(),
        "Retry-After": Math.floor((reset - Date.now()) / 1000).toString(),
      },
    });
  }

  return null;
}
```

### CORS Configuration

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  process.env.NEXT_PUBLIC_BASE_URL!,
  "https://app.example.com",
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = NextResponse.next();

  // Only allow specific origins
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );

  return response;
}
```

## Database Security

### Connection Security

```typescript
// drizzle.config.ts
export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === "production" ? {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_CA_CERT,
    } : false,
  },
};
```

### Query Security

```typescript
// Always use parameterized queries
import { sql } from "drizzle-orm";

// Good - parameterized
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, userInput));

// Bad - SQL injection vulnerable (never do this!)
// const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// For dynamic queries, use proper escaping
const column = ["name", "email"].includes(sortBy) ? sortBy : "name";
const order = ["asc", "desc"].includes(sortOrder) ? sortOrder : "asc";

const results = await db
  .select()
  .from(users)
  .orderBy(sql`${sql.identifier(column)} ${sql.raw(order)}`);
```

### Database Access Control

```sql
-- Create application user with limited permissions
CREATE USER app_user WITH PASSWORD 'strong_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE nextship TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Don't grant unnecessary permissions
-- REVOKE CREATE ON SCHEMA public FROM app_user;
-- REVOKE DROP ON ALL TABLES IN SCHEMA public FROM app_user;
```

## Environment Variables & Secrets

### Secret Management with SOPS

```yaml
# secrets.yaml - before encryption
database:
  url: "postgresql://user:password@host:5432/db"
auth:
  secret: "super-secret-key"
encryption:
  key: "base64-encoded-key"
```

```bash
# Encrypt secrets
sops -e secrets.yaml > secrets.enc.yaml

# Decrypt for use
sops -d secrets.enc.yaml > .env.local

# Never commit unencrypted secrets
echo ".env.local" >> .gitignore
echo "secrets.yaml" >> .gitignore
```

### Environment Variable Validation

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().regex(/^[A-Za-z0-9+/]{64}$/), // Base64
  NEXT_PUBLIC_BASE_URL: z.string().url(),
});

// Validate at startup
export const env = envSchema.parse(process.env);

// Type-safe environment variables throughout the app
// env.DATABASE_URL is guaranteed to exist and be valid
```

## Network Security

### HTTPS Enforcement

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Redirect HTTP to HTTPS in production
  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") !== "https"
  ) {
    return NextResponse.redirect(
      `https://${request.headers.get("host")}${request.nextUrl.pathname}`,
      301
    );
  }
}
```

### Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};
```

## Dependency Management

### Regular Updates

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# Check outdated packages
pnpm outdated

# Use automated tools
npm install -g npm-check-updates
ncu -u
pnpm install
```

### Dependency Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 0 * * *" # Daily

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run npm audit
        run: pnpm audit

      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
```

## Container Security

### Secure Docker Image

```dockerfile
# Use specific version, not latest
FROM node:22-alpine@sha256:specific-hash

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy only necessary files
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

USER nextjs

# Don't expose unnecessary information
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

EXPOSE 3000

CMD ["node", "server.js"]
```

### Container Scanning

```bash
# Scan image for vulnerabilities
trivy image use-next-ship:latest

# Use Snyk for container scanning
snyk container test use-next-ship:latest

# Sign images
cosign sign --key cosign.key use-next-ship:latest
```

## Kubernetes Security

### Pod Security Policy

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: use-next-ship
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: app
      image: use-next-ship:latest
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
      resources:
        limits:
          memory: "512Mi"
          cpu: "500m"
        requests:
          memory: "256Mi"
          cpu: "100m"
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: use-next-ship-network-policy
spec:
  podSelector:
    matchLabels:
      app: use-next-ship
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - protocol: TCP
          port: 5432
```

### Secret Management

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  database-url: "postgresql://user:pass@db:5432/nextship"
  auth-secret: "super-secret-key"
---
# Use Sealed Secrets for GitOps
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-secrets
spec:
  encryptedData:
    database-url: "encrypted-value"
    auth-secret: "encrypted-value"
```

## Security Monitoring

### Logging and Auditing

```typescript
// lib/audit.ts
interface AuditLog {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  result: "success" | "failure";
  metadata?: Record<string, any>;
}

export async function auditLog(log: AuditLog) {
  // Store in database
  await db.insert(auditLogs).values(log);

  // Send to SIEM if configured
  if (process.env.SIEM_ENDPOINT) {
    await fetch(process.env.SIEM_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(log),
    });
  }

  // Alert on suspicious activity
  if (log.result === "failure" && isSuspicious(log)) {
    await alertSecurityTeam(log);
  }
}
```

### Security Alerts

```typescript
// lib/security-alerts.ts
export async function detectAnomalies(userId: string) {
  const recentActivity = await getRecentActivity(userId);

  // Detect unusual patterns
  const anomalies = [];

  // Multiple failed login attempts
  const failedLogins = recentActivity.filter(
    (a) => a.action === "login" && a.result === "failure"
  );
  if (failedLogins.length > 5) {
    anomalies.push("Multiple failed login attempts");
  }

  // Access from new location
  const locations = [...new Set(recentActivity.map((a) => a.ip))];
  if (locations.length > 3) {
    anomalies.push("Access from multiple locations");
  }

  // Unusual time of access
  const nightAccess = recentActivity.filter((a) => {
    const hour = new Date(a.timestamp).getHours();
    return hour < 6 || hour > 22;
  });
  if (nightAccess.length > 0) {
    anomalies.push("Unusual access time");
  }

  if (anomalies.length > 0) {
    await notifySecurityTeam({ userId, anomalies });
  }

  return anomalies;
}
```

## Incident Response

### Response Plan

1. **Detection**: Identify the security incident
2. **Containment**: Limit the damage
3. **Eradication**: Remove the threat
4. **Recovery**: Restore normal operations
5. **Lessons Learned**: Document and improve

### Incident Response Checklist

```markdown
## Immediate Actions
- [ ] Isolate affected systems
- [ ] Preserve evidence (logs, memory dumps)
- [ ] Notify security team
- [ ] Begin incident documentation

## Investigation
- [ ] Identify attack vector
- [ ] Determine scope of breach
- [ ] Check for data exfiltration
- [ ] Review audit logs

## Containment
- [ ] Revoke compromised credentials
- [ ] Block malicious IPs
- [ ] Patch vulnerabilities
- [ ] Update security rules

## Recovery
- [ ] Restore from clean backups
- [ ] Reset all passwords
- [ ] Verify system integrity
- [ ] Monitor for re-infection

## Post-Incident
- [ ] Complete incident report
- [ ] Notify affected users (if required)
- [ ] Update security procedures
- [ ] Conduct security training
```

## Security Checklist

### Development Phase

- [ ] Input validation on all user inputs
- [ ] Output encoding to prevent XSS
- [ ] Parameterized queries to prevent SQL injection
- [ ] Authentication and authorization checks
- [ ] Secure session management
- [ ] HTTPS enforcement
- [ ] Security headers configured
- [ ] Dependency vulnerability scanning
- [ ] Code security scanning (SAST)
- [ ] Secrets not hardcoded

### Deployment Phase

- [ ] Environment variables validated
- [ ] Secrets encrypted (SOPS)
- [ ] Database connections encrypted (SSL)
- [ ] Container images scanned
- [ ] Kubernetes security policies applied
- [ ] Network policies configured
- [ ] RBAC properly configured
- [ ] Backup and recovery tested
- [ ] Monitoring and alerting enabled
- [ ] Incident response plan ready

### Production Maintenance

- [ ] Regular security updates
- [ ] Dependency updates
- [ ] Security patches applied
- [ ] Log monitoring
- [ ] Anomaly detection
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Compliance checks
- [ ] User access reviews
- [ ] Incident response drills

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email <security@use-next-ship.dev> with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. Allow up to 48 hours for initial response
4. Work with us to fix the issue before public disclosure

We appreciate responsible disclosure and will credit security researchers who help improve our security.
