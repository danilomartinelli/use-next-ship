# Architecture Overview

## System Architecture

Use Next Ship follows a modern, scalable architecture designed for production-ready Next.js applications with enterprise-grade deployment capabilities.

## Core Principles

1. **Type Safety First**: End-to-end type safety from database to frontend
2. **Server-First Rendering**: Leverage React Server Components for optimal performance
3. **Reproducible Environments**: Consistent development across teams with Nix/devenv
4. **Security by Design**: Built-in authentication, validation, and secure secrets management
5. **Scalability**: Kubernetes-ready with horizontal scaling capabilities

## High-Level Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                   Client Browser                         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Next.js App (React 19)                 │   │
│  │  - Server Components (default)                   │   │
│  │  - Client Components (interactive)               │   │
│  │  - Tailwind CSS v4 styling                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│                    Edge/CDN Layer                        │
│              (Vercel Edge / CloudFlare)                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                 Application Server                       │
│                   (Node.js 22)                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Next.js App Router                  │   │
│  │  - API Routes (/api/*)                          │   │
│  │  - Server Actions                               │   │
│  │  - Middleware                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Authentication Layer                  │   │
│  │         (BetterAuth.js + Sessions)              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                │
│  │  PostgreSQL    │  │     Redis      │                │
│  │  (Primary DB)  │  │   (Cache)      │                │
│  └────────────────┘  └────────────────┘                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Drizzle ORM                           │   │
│  │  - Type-safe queries                            │   │
│  │  - Migrations                                   │   │
│  │  - Transaction support                          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Architecture

```text
src/app/
├── (auth)/                 # Authentication routes
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (dashboard)/           # Protected dashboard routes
│   ├── layout.tsx        # Dashboard layout
│   └── page.tsx          # Dashboard home
├── api/                   # API routes
│   └── auth/             # Auth endpoints
│       └── [...all]/     # BetterAuth catch-all
├── layout.tsx            # Root layout
└── page.tsx              # Landing page
```

### Backend Architecture

```text
src/server/
├── auth/                  # Authentication logic
│   ├── index.ts          # BetterAuth configuration
│   └── middleware.ts     # Auth middleware
├── db/                    # Database layer
│   ├── schema.ts         # Drizzle schema definitions
│   ├── index.ts          # Database connection
│   └── migrations/       # SQL migrations
└── services/             # Business logic
    ├── user.service.ts   # User operations
    └── org.service.ts    # Organization operations
```

## Data Flow Architecture

### Request Flow

1. **Client Request** → Edge/CDN → Application Server
2. **Middleware** → Authentication check → Route handler
3. **Server Component** → Data fetching → HTML generation
4. **Response** → Streaming HTML → Client hydration

### Authentication Flow

```text
User Login Request
    ↓
BetterAuth.js validates credentials
    ↓
Create session in database
    ↓
Set HTTP-only cookie
    ↓
Return user data + session
```

### Data Access Pattern

```text
Server Component / API Route
    ↓
Service Layer (business logic)
    ↓
Drizzle ORM (type-safe queries)
    ↓
PostgreSQL Database
```

## Security Architecture

### Authentication & Authorization

- **BetterAuth.js**: Handles authentication with organizations support
- **Session Management**: Server-side sessions with HTTP-only cookies
- **RBAC**: Role-based access control for organizations
- **Password Security**: Bcrypt hashing with salt rounds

### Data Protection

- **Environment Variables**: Validated with Zod schemas
- **Secrets Management**: SOPS encryption for production secrets
- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Protection**: React's built-in escaping + CSP headers

### Network Security

- **HTTPS**: Enforced in production
- **CORS**: Configured per environment
- **Rate Limiting**: Redis-based throttling (planned)
- **Security Headers**: Helmet.js configuration

## Deployment Architecture

### Container Architecture

```dockerfile
# Multi-stage build
1. Dependencies stage (pnpm install)
2. Build stage (Next.js build)
3. Runtime stage (minimal production image)
```

### Kubernetes Architecture

```yaml
Namespace: application
├── Deployment (Next.js pods)
├── Service (ClusterIP)
├── Ingress (External access)
├── ConfigMap (Configuration)
└── Secret (Sensitive data)
```

### CI/CD Pipeline

```text
Git Push → GitHub Actions → Build & Test → Docker Build → Push Registry → Deploy Kubernetes
```

## Performance Architecture

### Optimization Strategies

1. **Server Components by Default**: Minimize client JavaScript
2. **Streaming SSR**: Progressive HTML delivery
3. **Image Optimization**: Next.js Image component with lazy loading
4. **Code Splitting**: Automatic route-based splitting
5. **Caching Strategy**:
   - Static assets: CDN with long cache
   - API responses: Redis caching (planned)
   - Database queries: Connection pooling

### Performance Metrics

- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Time to First Byte**: < 600ms
- **Bundle Size**: < 200KB initial JavaScript

## Scalability Architecture

### Horizontal Scaling

- **Stateless Application**: Sessions in database, not memory
- **Load Balancing**: Kubernetes service distribution
- **Database Pooling**: PgBouncer for connection management
- **Caching Layer**: Redis for session and data caching

### Vertical Scaling

- **Resource Limits**: Configured in Kubernetes deployments
- **Auto-scaling**: HPA based on CPU/memory metrics
- **Database Scaling**: Read replicas for query distribution

## Development Architecture

### Local Development Stack

```text
Nix/devenv
├── Node.js 22 (exact version)
├── PostgreSQL 16
├── Redis (optional)
├── pnpm package manager
└── Development tools
```

### Testing Architecture

- **Unit Tests**: Vitest for isolated component testing
- **Integration Tests**: API and database testing
- **E2E Tests**: Playwright for user flows (planned)
- **Performance Tests**: Lighthouse CI integration

## Future Architecture Considerations

### Microservices Migration Path

When scaling beyond monolith:

1. Extract authentication service
2. Separate background job processing
3. Split by domain boundaries
4. Implement API gateway

### Multi-Region Deployment

- Database replication strategy
- CDN configuration for global distribution
- Session management across regions
- Compliance with data residency requirements

## Architecture Decision Records (ADRs)

### ADR-001: Next.js App Router

**Status**: Accepted
**Context**: Need modern React features and better performance
**Decision**: Use Next.js 15+ with App Router
**Consequences**: Server Components by default, better SEO, streaming SSR

### ADR-002: Drizzle ORM

**Status**: Accepted
**Context**: Need type-safe database access
**Decision**: Use Drizzle ORM instead of Prisma
**Consequences**: Lighter weight, better performance, SQL-like syntax

### ADR-003: BetterAuth.js

**Status**: Accepted
**Context**: Need authentication with organizations support
**Decision**: Use BetterAuth.js over NextAuth
**Consequences**: Built-in organizations, better TypeScript support

### ADR-004: Nix/devenv

**Status**: Accepted
**Context**: Need reproducible development environments
**Decision**: Use Nix with devenv for environment management
**Consequences**: Consistent environments, longer initial setup

## Monitoring & Observability

### Logging Strategy

- **Application Logs**: Structured JSON logging
- **Error Tracking**: Sentry integration (planned)
- **Performance Monitoring**: APM tools (planned)

### Metrics Collection

- **Application Metrics**: Response times, error rates
- **Infrastructure Metrics**: CPU, memory, network
- **Business Metrics**: User activity, conversion rates

### Health Checks

- **Liveness Probe**: `/healthz` endpoint
- **Readiness Probe**: Database connectivity check
- **Startup Probe**: Application initialization status
