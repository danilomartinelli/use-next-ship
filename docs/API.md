# API Documentation

## Overview

The Use Next Ship API is built with Next.js App Router, providing both Server Components and API routes with type-safe data fetching, authentication, and validation.

## Table of Contents

- [API Structure](#api-structure)
- [Authentication](#authentication)
- [API Routes](#api-routes)
- [Server Actions](#server-actions)
- [Data Validation](#data-validation)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Testing API Endpoints](#testing-api-endpoints)
- [API Security](#api-security)
- [Future: tRPC Integration](#future-trpc-integration)

## API Structure

### Directory Layout

```text
src/app/
├── api/                    # API routes
│   ├── auth/              # Authentication endpoints
│   │   └── [...all]/      # BetterAuth catch-all handler
│   ├── health/            # Health check endpoints
│   │   ├── route.ts       # Basic health check
│   │   └── ready/         # Readiness probe
│   └── [resource]/        # Resource-specific endpoints
│       └── route.ts       # GET, POST, PUT, DELETE handlers
└── actions/               # Server Actions
    ├── auth.ts           # Authentication actions
    ├── user.ts           # User management actions
    └── organization.ts   # Organization actions
```

## Authentication

### BetterAuth Configuration

The API uses BetterAuth.js for authentication with built-in support for:

- Email/password authentication
- Session management
- Organization support
- Role-based access control

### Authentication Endpoints

#### Sign Up

```typescript
POST /api/auth/sign-up
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}

Response:
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "session_id",
    "expiresAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Sign In

```typescript
POST /api/auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "user": { ... },
  "session": { ... }
}
```

#### Sign Out

```typescript
POST /api/auth/sign-out

Response: 204 No Content
```

#### Get Session

```typescript
GET /api/auth/session

Response:
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "session_id",
    "expiresAt": "2024-01-01T00:00:00Z"
  }
}
```

### Protected Routes

Protect API routes using the authentication middleware:

```typescript
// app/api/protected/route.ts
import { auth } from "@/server/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Access authenticated user
  const user = session.user;

  return NextResponse.json({
    message: "Protected data",
    userId: user.id,
  });
}
```

## API Routes

### Creating API Routes

API routes in Next.js 15 use the App Router pattern:

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

// GET /api/users
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const results = await db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: results,
      pagination: {
        limit,
        offset,
        total: await db.$count(users),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const createUserSchema = z.object({
      email: z.string().email(),
      name: z.string().min(1),
    });

    const validatedData = createUserSchema.parse(body);

    const [user] = await db
      .insert(users)
      .values(validatedData)
      .returning();

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
```

### Dynamic Routes

Handle dynamic segments in API routes:

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = params.id;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user.length) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(user[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Update logic
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Delete logic
}
```

## Server Actions

Server Actions provide a way to run server-side code directly from React components:

### Creating Server Actions

```typescript
// app/actions/user.ts
"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { revalidatePath } from "next/cache";

const updateProfileSchema = z.object({
  name: z.string().min(1),
  bio: z.string().optional(),
});

export async function updateProfile(formData: FormData) {
  const session = await auth.api.getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const validatedData = updateProfileSchema.parse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });

  await db
    .update(users)
    .set(validatedData)
    .where(eq(users.id, session.user.id));

  revalidatePath("/profile");

  return { success: true };
}
```

### Using Server Actions in Components

```tsx
// app/profile/page.tsx
import { updateProfile } from "@/app/actions/user";

export default function ProfilePage() {
  return (
    <form action={updateProfile}>
      <input name="name" required />
      <textarea name="bio" />
      <button type="submit">Update Profile</button>
    </form>
  );
}
```

### Server Actions with Client Components

```tsx
// app/profile/profile-form.tsx
"use client";

import { useFormStatus } from "react-dom";
import { updateProfile } from "@/app/actions/user";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Updating..." : "Update Profile"}
    </button>
  );
}

export function ProfileForm() {
  async function handleSubmit(formData: FormData) {
    const result = await updateProfile(formData);

    if (result.success) {
      // Handle success
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <textarea name="bio" />
      <SubmitButton />
    </form>
  );
}
```

## Data Validation

### Zod Schemas

Define reusable validation schemas:

```typescript
// lib/validations/user.ts
import { z } from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  role: z.enum(["admin", "member"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = userSchema.partial().omit({
  id: true,
  email: true,
  createdAt: true,
});

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

### Validation Middleware

Create reusable validation middleware:

```typescript
// lib/api/validation.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validated = schema.parse(body);
      return { data: validated, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          data: null,
          error: NextResponse.json(
            { error: "Validation failed", details: error.errors },
            { status: 400 }
          ),
        };
      }
      return {
        data: null,
        error: NextResponse.json(
          { error: "Invalid request body" },
          { status: 400 }
        ),
      };
    }
  };
}

// Usage
export async function POST(request: NextRequest) {
  const validator = validateBody(createUserSchema);
  const { data, error } = await validator(request);

  if (error) return error;

  // Use validated data
  const user = await createUser(data);
  return NextResponse.json(user);
}
```

## Error Handling

### Error Response Format

Standardize error responses:

```typescript
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.errors,
      },
      { status: 400 }
    );
  }

  console.error("Unexpected error:", error);

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

### Global Error Handling

```typescript
// app/api/users/route.ts
import { errorResponse, ApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const users = await fetchUsers();

    if (!users) {
      throw new ApiError("Users not found", 404, "USERS_NOT_FOUND");
    }

    return NextResponse.json(users);
  } catch (error) {
    return errorResponse(error);
  }
}
```

## Rate Limiting

### Redis-based Rate Limiting (Future Implementation)

```typescript
// lib/api/rate-limit.ts
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { NextRequest, NextResponse } from "next/server";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Create rate limiter
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
  analytics: true,
});

export async function rateLimitMiddleware(
  request: NextRequest,
  identifier?: string
) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success, limit, reset, remaining } = await ratelimit.limit(
    identifier ?? ip
  );

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(reset).toISOString(),
        },
      }
    );
  }

  return null;
}

// Usage in API route
export async function POST(request: NextRequest) {
  const rateLimitError = await rateLimitMiddleware(request);
  if (rateLimitError) return rateLimitError;

  // Continue with request processing
}
```

## Testing API Endpoints

### Unit Tests with Vitest

```typescript
// __tests__/api/users.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/users/route";
import { NextRequest } from "next/server";

describe("Users API", () => {
  beforeEach(async () => {
    // Reset database or mock data
  });

  it("should fetch users", async () => {
    const request = new NextRequest(
      new Request("http://localhost/api/users")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("should create a user", async () => {
    const request = new NextRequest(
      new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          name: "Test User",
        }),
      })
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty("id");
    expect(data.email).toBe("test@example.com");
  });
});
```

### Integration Tests

```typescript
// __tests__/api/integration/auth.test.ts
import { describe, it, expect } from "vitest";
import { testClient } from "@/test/utils";

describe("Authentication Flow", () => {
  it("should complete full auth flow", async () => {
    // 1. Sign up
    const signUpRes = await testClient.post("/api/auth/sign-up", {
      email: "test@example.com",
      password: "SecurePass123!",
      name: "Test User",
    });

    expect(signUpRes.status).toBe(200);
    expect(signUpRes.data).toHaveProperty("session");

    // 2. Sign out
    const signOutRes = await testClient.post("/api/auth/sign-out");
    expect(signOutRes.status).toBe(204);

    // 3. Sign in
    const signInRes = await testClient.post("/api/auth/sign-in", {
      email: "test@example.com",
      password: "SecurePass123!",
    });

    expect(signInRes.status).toBe(200);
    expect(signInRes.data).toHaveProperty("session");
  });
});
```

## API Security

### Security Headers

Configure security headers in middleware:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith("/api")) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      process.env.NEXT_PUBLIC_BASE_URL || "*"
    );
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### Input Sanitization

Sanitize user input to prevent XSS:

```typescript
// lib/api/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}
```

### SQL Injection Prevention

Drizzle ORM automatically prevents SQL injection through parameterized queries:

```typescript
// Safe - Uses parameterized queries
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, userInput)); // userInput is safely parameterized

// Never use raw SQL with user input
// Unsafe - Don't do this!
// const user = await db.execute(sql`SELECT * FROM users WHERE email = ${userInput}`);
```

## Future: tRPC Integration

The boilerplate is designed to easily integrate tRPC for type-safe APIs:

### Planned tRPC Setup

```typescript
// server/api/root.ts (future)
import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "@/server/api/routers/user";
import { postRouter } from "@/server/api/routers/post";

export const appRouter = createTRPCRouter({
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
```

### Planned tRPC Client Usage

```tsx
// components/user-list.tsx (future)
"use client";

import { api } from "@/trpc/react";

export function UserList() {
  const { data: users, isLoading } = api.user.list.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Benefits of tRPC

- **End-to-end Type Safety**: Share types between client and server
- **Auto-completion**: IDE support for API methods
- **No Code Generation**: Types inferred automatically
- **RPC-like Experience**: Call server functions like local functions

## Best Practices

### 1. Always Validate Input

Never trust client input. Always validate and sanitize:

```typescript
const schema = z.object({
  email: z.string().email().toLowerCase(),
  age: z.number().min(0).max(120),
});

const validated = schema.parse(input);
```

### 2. Use Proper HTTP Methods

- **GET**: Fetch data (idempotent)
- **POST**: Create new resources
- **PUT**: Update entire resources
- **PATCH**: Partial updates
- **DELETE**: Remove resources

### 3. Implement Pagination

Always paginate list endpoints:

```typescript
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const limit = Math.min(
  parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)),
  MAX_LIMIT
);
```

### 4. Handle Errors Gracefully

Provide meaningful error messages:

```typescript
if (!user) {
  return NextResponse.json(
    {
      error: "User not found",
      code: "USER_NOT_FOUND",
      suggestion: "Check the user ID and try again",
    },
    { status: 404 }
  );
}
```

### 5. Use Caching Strategically

Cache responses when appropriate:

```typescript
return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
  },
});
```

### 6. Document Your API

Use OpenAPI/Swagger for API documentation:

```typescript
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of users to return
 */
```

### 7. Version Your API

Plan for API evolution:

```typescript
// app/api/v1/users/route.ts
// app/api/v2/users/route.ts
```

## Useful Resources

- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [BetterAuth.js Documentation](https://better-auth.com)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Zod Validation Documentation](https://zod.dev)
- [tRPC Documentation](https://trpc.io) (for future integration)
