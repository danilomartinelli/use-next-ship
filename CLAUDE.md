# Agent Instructions for use-next-ship

## Commands

- **Build**: `pnpm build` or `next build`
- **Dev**: `pnpm dev` (uses Turbo)
- **Lint**: `pnpm lint` (Biome linter)
- **Lint Fix**: `pnpm format` (Biome linter with auto-fix)
- **Type Check**: `pnpm typecheck` or `tsc --noEmit`
- **Format Check**: `pnpm format:check`
- **Format Write**: `pnpm format:write`
- **Full Check**: `pnpm check` (lint + typecheck)

## Workflow Rules

- **Auto-format**: Always run `pnpm format` after making any code changes to ensure consistent formatting
- **Lint Check**: Always run `pnpm check` after making code changes to catch linting and type errors
- **Pnpm Install**: Always use `pnpm` as the package manager for installing dependencies and managing packages

## Git Conventions

- **Commit Messages**: Follow conventional commit messages for all commits (e.g., `feat:`, `fix:`, `chore:`)
- **Branch Naming**: Use descriptive branch names that reflect the feature or fix being worked on (e.g., `feature/user-auth`, `fix/login-bug`)
- **Pull Requests**: Ensure all PRs pass CI checks before merging; include a description of changes and link to any relevant issues

## Code Style

- **TypeScript**: Strict mode, `noUncheckedIndexedAccess`, prefer type imports with `type` keyword
- **Components**: PascalCase naming, `.tsx` extension, use `"use client"` for client components
- **Imports**: External first, then `@/` prefixed internal imports (e.g., `@/trpc/react`)
- **tRPC**: Use `useSuspenseQuery()`, `useMutation()` hooks; invalidate queries with `utils.invalidate()`
- **Forms**: Handle `isPending` state for mutations, use `onSuccess` callbacks
- **Styling**: Tailwind CSS classes, responsive design patterns
- **Error Handling**: Zod validation on tRPC inputs, check mutation states
- **Naming**: camelCase for variables/functions, SCREAMING_SNAKE_CASE for constants

## Version Management

- **Authoritative Source**: All software versions are defined in `devenv.nix` and are the single source of truth
- **Consistency Rule**: Any version specified in `devenv.nix` (Node.js, package versions, etc.) MUST be used consistently across:
  - `Dockerfile` base images
  - GitHub Actions workflow Node.js versions
  - Any other configuration files that specify versions
- **When Updating**: Always update `devenv.nix` first, then propagate changes to all other files
