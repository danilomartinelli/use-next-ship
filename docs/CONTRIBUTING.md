# Contributing to Use Next Ship

Thank you for your interest in contributing to Use Next Ship! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a friendly, safe, and welcoming environment for all contributors, regardless of experience level, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, nationality, or other similar characteristics.

### Our Standards

**Examples of behavior that contributes to a positive environment:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**

- The use of sexualized language or imagery and unwelcome sexual attention
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

1. **Nix Package Manager** installed
2. **devenv** for development environment management
3. **direnv** for automatic environment loading
4. **Git** for version control
5. A **GitHub** account

### Setting Up Your Development Environment

1. **Fork the repository**

   Click the "Fork" button on the [GitHub repository](https://github.com/danilomartinelli/use-next-ship)

2. **Clone your fork**

   ```bash
   git clone https://github.com/your-username/use-next-ship.git
   cd use-next-ship
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/danilomartinelli/use-next-ship.git
   ```

4. **Set up development environment**

   ```bash
   # Allow direnv to load environment
   direnv allow

   # Start services (PostgreSQL, Redis)
   devenv up

   # Install dependencies
   pnpm install

   # Set up database
   pnpm db:push

   # Start development server
   pnpm dev
   ```

5. **Verify setup**

   Open `http://localhost:3000` to ensure the application is running

## Development Workflow

### 1. Sync with Upstream

Before starting work, ensure your fork is up to date:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

### 3. Make Your Changes

Follow the coding standards and make your changes:

```bash
# Make changes
code .

# Run format and lint
pnpm format
pnpm check

# Run tests
pnpm test
```

### 4. Commit Your Changes

Follow the commit guidelines:

```bash
git add .
git commit -m "feat: add user profile component"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

Go to your fork on GitHub and click "New Pull Request"

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

**How to submit a good bug report:**

1. Use a clear and descriptive title
2. Describe the exact steps to reproduce the problem
3. Provide specific examples
4. Describe the behavior you observed and expected
5. Include screenshots if relevant
6. Include your environment details:
   - OS and version
   - Node.js version
   - Browser and version
   - Database version

Example bug report template:

```markdown
## Bug Description
A clear and concise description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Screenshots
If applicable, add screenshots

## Environment
- OS: macOS 14.0
- Node: 22.0.0
- Browser: Chrome 120
- Database: PostgreSQL 16
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues.

**How to submit a good enhancement suggestion:**

1. Use a clear and descriptive title
2. Provide a step-by-step description of the enhancement
3. Provide specific examples to demonstrate the steps
4. Describe the current behavior and explain the new behavior
5. Explain why this enhancement would be useful
6. List any alternative solutions you've considered

### Your First Code Contribution

Unsure where to begin? Look for these labels in issues:

- `good first issue` - Good for beginners
- `help wanted` - Extra attention needed
- `documentation` - Documentation improvements
- `easy` - Simple fixes that don't require deep knowledge

## Coding Standards

### TypeScript

```typescript
// Use explicit types
const getUserName = (user: User): string => {
  return user.name;
};

// Prefer interfaces over types for objects
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

// Use enums for constants
enum UserRole {
  Admin = "admin",
  Member = "member",
  Guest = "guest",
}

// Use proper error handling
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof CustomError) {
    // Handle specific error
  }
  throw error;
}
```

### React/Next.js

```tsx
// Use functional components with TypeScript
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ onClick, children, variant = "primary" }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn("btn", variant === "primary" ? "btn-primary" : "btn-secondary")}
    >
      {children}
    </button>
  );
}

// Use proper hooks
import { useState, useEffect, useCallback } from "react";

// Memoize expensive operations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(props.data);
}, [props.data]);
```

### File Organization

```text
src/
├── app/                 # Next.js app router
│   ├── (auth)/         # Route groups
│   ├── api/            # API routes
│   └── components/     # Page-specific components
├── components/         # Shared components
│   ├── ui/            # Base UI components
│   └── forms/         # Form components
├── lib/               # Utility functions
├── hooks/             # Custom React hooks
├── server/            # Server-side code
│   ├── auth/         # Authentication
│   ├── db/           # Database
│   └── services/     # Business logic
└── types/             # TypeScript types
```

### Naming Conventions

- **Files**: Use kebab-case for files (`user-profile.tsx`)
- **Components**: Use PascalCase (`UserProfile`)
- **Functions**: Use camelCase (`getUserData`)
- **Constants**: Use SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Types/Interfaces**: Use PascalCase (`UserProfile`)
- **Database**: Use snake_case for tables and columns (`user_profiles`)

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```text
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system or dependency changes
- **ci**: CI/CD configuration changes
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Examples

```bash
# Feature
feat(auth): add OAuth2 Google provider

# Bug fix
fix(api): handle null user in profile endpoint

# Documentation
docs(readme): update installation instructions

# Refactoring
refactor(components): extract Button component

# With breaking change
feat(api)!: change user endpoint response format

BREAKING CHANGE: The user endpoint now returns a nested data object
```

### Commit Message Rules

1. Use present tense ("add feature" not "added feature")
2. Use imperative mood ("move cursor" not "moves cursor")
3. Limit the first line to 72 characters
4. Reference issues and pull requests when relevant
5. Add detailed description in body when necessary

## Pull Request Process

### Before Submitting

1. **Update documentation** if you've changed APIs
2. **Add tests** for new functionality
3. **Ensure all tests pass**: `pnpm test`
4. **Check linting**: `pnpm check`
5. **Format code**: `pnpm format`
6. **Update CHANGELOG.md** with your changes
7. **Verify build**: `pnpm build`

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] All tests pass locally
- [ ] Any dependent changes have been merged

## Related Issues
Fixes #(issue number)

## Screenshots (if applicable)
```

### Review Process

1. At least one maintainer review is required
2. All CI checks must pass
3. No merge conflicts
4. Follow-up on review comments promptly
5. Squash commits if requested

## Testing Guidelines

### Writing Tests

```typescript
// Example unit test
import { describe, it, expect, beforeEach } from "vitest";
import { calculateTax } from "@/lib/calculations";

describe("calculateTax", () => {
  it("should calculate tax correctly", () => {
    expect(calculateTax(100, 0.1)).toBe(10);
  });

  it("should handle zero amount", () => {
    expect(calculateTax(0, 0.1)).toBe(0);
  });

  it("should throw error for negative amount", () => {
    expect(() => calculateTax(-100, 0.1)).toThrow();
  });
});
```

### Test Coverage

- Aim for at least 80% code coverage
- Critical paths should have 100% coverage
- Include edge cases and error scenarios

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/lib/calculations.test.ts
```

## Documentation

### Code Documentation

```typescript
/**
 * Calculates the tax amount for a given price
 *
 * @param price - The base price before tax
 * @param taxRate - The tax rate as a decimal (e.g., 0.1 for 10%)
 * @returns The calculated tax amount
 * @throws {Error} If price is negative
 *
 * @example
 * ```typescript
 * const tax = calculateTax(100, 0.1); // Returns 10
 * ```
 */
export function calculateTax(price: number, taxRate: number): number {
  if (price < 0) {
    throw new Error("Price cannot be negative");
  }
  return price * taxRate;
}
```

### README Documentation

- Keep the README up to date
- Document new features
- Update installation steps if changed
- Add examples for new functionality

### API Documentation

- Document all API endpoints
- Include request/response examples
- Specify authentication requirements
- Document error responses

## Community

### Getting Help

- **Discord**: [Join our Discord server](https://discord.gg/use-next-ship)
- **GitHub Discussions**: Ask questions and share ideas
- **Stack Overflow**: Tag questions with `use-next-ship`

### Communication Channels

- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Discussions
- **Security Issues**: Email <security@use-next-ship.dev>
- **General Questions**: Discord or Discussions

### Recognition

We value all contributions! Contributors will be:

- Listed in the project's contributors section
- Mentioned in release notes for significant contributions
- Given credit in the documentation for documentation contributions

## License

By contributing, you agree that your contributions will be licensed under the project's BSD-3-Clause License.

## Questions?

Don't hesitate to ask questions! We're here to help you contribute successfully.

Thank you for contributing to Use Next Ship! 🚀
