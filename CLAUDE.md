# Agent Instructions for use-next-ship

## Project Overview

This is a production-ready Next.js 15+ boilerplate with Kubernetes deployment capabilities, using TypeScript, BetterAuth.js, Drizzle ORM, and Nix/devenv for reproducible development environments.

## Commands

### Development

- **Dev Server**: `pnpm dev` (runs with Turbopack)
- **Build**: `pnpm build` (production build with Turbopack)
- **Start**: `pnpm start` (production server)

### Code Quality

- **Lint**: `pnpm lint` (Biome linter check)
- **Format**: `pnpm format` (Biome auto-format)
- **Type Check**: `pnpm typecheck` or `tsc --noEmit`
- **Full Check**: `pnpm check` (runs both lint + typecheck)
- **Format Check**: `pnpm format:check` (check formatting without changes)
- **Format Write**: `pnpm format:write` (apply formatting)

### Database

- **Push Schema**: `pnpm db:push` (push schema to database)
- **Generate Migrations**: `pnpm db:generate` (create migration files)
- **Run Migrations**: `pnpm db:migrate` (apply migrations)
- **Database Studio**: `pnpm db:studio` (open Drizzle Studio GUI)

### Testing

- **Run Tests**: `pnpm test` (run all tests)
- **Test UI**: `pnpm test:ui` (interactive test UI)
- **Setup Test DB**: `pnpm test:setup`
- **Teardown Test DB**: `pnpm test:teardown`

### Documentation

- **Lint Docs**: `pnpm docs:lint` (check markdown files)
- **Fix Docs**: `pnpm docs:fix` (auto-fix markdown issues)

## Workflow Rules

### Quality Gates

- **Auto-format**: Always run `pnpm format` after making code changes
- **Validation**: Always run `pnpm check` before committing to catch type and lint errors
- **Test Coverage**: Run `pnpm test` for any logic changes
- **Database Changes**: Use `pnpm db:generate` for schema changes, then `pnpm db:push`

### Package Management

- **Package Manager**: Always use `pnpm` (never npm or yarn)
- **Version Pinning**: Exact versions in package.json
- **Lock File**: Never delete pnpm-lock.yaml

## Git Conventions

### Commit Messages

Follow conventional commits format:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc.)
- `refactor:` Code refactoring without feature changes
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependency updates

### Branch Strategy

- **Main Branch**: `main` (protected, production-ready)
- **Feature Branches**: `feature/description` (e.g., `feature/user-dashboard`)
- **Fix Branches**: `fix/description` (e.g., `fix/auth-redirect`)
- **Chore Branches**: `chore/description` (e.g., `chore/update-deps`)

### Pull Requests

- Must pass all CI checks
- Include clear description of changes
- Link to related issues
- Add screenshots for UI changes
- Request review from appropriate team members

## Code Style

### TypeScript

- **Strict Mode**: Always enabled
- **Type Imports**: Use `import type` for type-only imports
- **No Any**: Avoid `any`, use `unknown` or proper types
- **Null Checks**: Use optional chaining (`?.`) and nullish coalescing (`??`)
- **Index Access**: Enable `noUncheckedIndexedAccess` for safer array/object access

### React/Next.js

- **Components**: PascalCase naming, `.tsx` extension
- **Client Components**: Add `"use client"` directive when needed
- **Server Components**: Default (no directive needed)
- **File Organization**: Colocate related files (component + styles + tests)
- **Data Fetching**: Use server components for data fetching when possible

### Imports

Order imports as follows:

1. External packages
2. Internal imports with `@/` prefix
3. Relative imports
4. Style imports

Example:

```typescript
import { useState } from 'react'
import { betterAuth } from 'better-auth'

import { db } from '@/server/db'
import { env } from '@/env'

import { Button } from './button'
import styles from './component.module.css'
```

### Database (Drizzle ORM)

- **Schema**: Define in `src/server/db/schema.ts`
- **Queries**: Use type-safe query builder
- **Transactions**: Use for multi-table operations
- **Naming**: Table prefix `use_next_ship_`

### Authentication (BetterAuth.js)

- **Configuration**: In `src/server/auth/index.ts`
- **Client Hooks**: Use from `src/lib/auth-client.ts`
- **Protected Routes**: Check session in server components
- **Organizations**: Support multi-tenant features

### Styling (Tailwind CSS)

- **Utility Classes**: Prefer Tailwind utilities over custom CSS
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Use dark: prefix for dark mode styles
- **Custom Styles**: Only when Tailwind doesn't provide the utility

### Error Handling

- **Validation**: Use Zod schemas for input validation
- **Error Boundaries**: Wrap components that might fail
- **User Feedback**: Show clear error messages
- **Logging**: Log errors for debugging (not in production)

### Naming Conventions

- **Variables/Functions**: camelCase (e.g., `getUserData`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (e.g., `UserProfile`)
- **Files**: kebab-case for non-components (e.g., `auth-utils.ts`)
- **Database**: snake_case for tables/columns

## Version Management

### Source of Truth

- **devenv.nix**: Authoritative source for all tool versions
- **Consistency**: Versions must match across:
  - Dockerfile base images
  - GitHub Actions workflows
  - package.json engines field
  - Any configuration files

### Update Process

1. Update version in `devenv.nix`
2. Propagate to Dockerfile
3. Update GitHub Actions workflows
4. Test locally with `devenv up`
5. Commit all changes together

## Project Structure

```text
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── (routes)/       # Page routes
│   └── layout.tsx      # Root layout
├── lib/                # Shared utilities
├── server/             # Server-side code
│   ├── auth/          # Authentication
│   └── db/            # Database
└── env.js             # Environment validation
```

## Environment Variables

### Required

- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Authentication secret (production only)
- `NEXT_PUBLIC_BASE_URL`: Application base URL

### Optional

- `BETTER_AUTH_URL`: Override auth URL for non-Vercel deployments
- `REDIS_URL`: Redis connection for caching/rate limiting

## Testing Strategy

### Unit Tests

- Test utilities and pure functions
- Mock external dependencies
- Fast execution with Vitest

### Integration Tests

- Test API routes and database operations
- Use transaction rollbacks for isolation
- Real database connections

### E2E Tests (Future)

- Test critical user flows
- Use Playwright for browser automation
- Run against staging environment

## Deployment

### Local Development

```bash
direnv allow        # Load environment
devenv up          # Start services
pnpm db:push       # Setup database
pnpm dev           # Start dev server
```

### Production Build

```bash
pnpm build         # Build application
pnpm start         # Start production server
```

### Docker

```bash
make build-docker-image SHORT_SHA=<sha>
```

### Kubernetes

```bash
make deploy IMAGE_TAG=<tag> ENVIRONMENT=prod NAMESPACE=<ns>
```

## Common Tasks

### Add New Feature

1. Create feature branch
2. Implement with tests
3. Run `pnpm check`
4. Create PR with description

### Update Database Schema

1. Modify `src/server/db/schema.ts`
2. Run `pnpm db:generate`
3. Review migration file
4. Run `pnpm db:push`

### Add Authentication Provider

1. Configure in `src/server/auth/index.ts`
2. Add environment variables
3. Update auth client if needed
4. Test login flow

### Debug Issues

1. Check browser console
2. Review server logs
3. Verify environment variables
4. Check database connection
5. Run `pnpm typecheck` for type issues

## Performance Considerations

- Use server components by default
- Implement code splitting for large components
- Optimize images with Next.js Image component
- Use dynamic imports for heavy libraries
- Cache API responses when appropriate
- Minimize client-side JavaScript

## Security Best Practices

- Never commit secrets to repository
- Use environment variables for sensitive data
- Validate all user inputs with Zod
- Implement rate limiting for APIs
- Use HTTPS in production
- Keep dependencies updated
- Enable CSP headers

## Future Enhancements (Not Yet Implemented)

The following features are planned but not yet available:

- tRPC for type-safe APIs
- Redis integration for caching
- Multi-tenant middleware
- OAuth providers (Google, GitHub)
- Component library with UI components
- Email service integration
- Comprehensive test suite

---

## Important Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files unless explicitly requested
- Only use emojis if the user explicitly requests it
