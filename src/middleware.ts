import { type NextRequest, NextResponse } from "next/server";

// Environment configuration with validation
const PORT = process.env.PORT ?? "3000";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? `http://localhost:${PORT}`;
const ROOT_DOMAIN = (
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, "") ??
  `localhost:${PORT}`
)
  .split(":")[0]
  .toLowerCase();

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const FETCH_TIMEOUT = parseInt(process.env.FETCH_TIMEOUT ?? "5000", 10); // 5 seconds default

// Reserved slugs that cannot be used as tenant identifiers
const RESERVED_SLUGS = new Set([
  "api",
  "_next",
  "static",
  "public",
  "admin",
  "healthz",
  ".well-known",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

// Type definition for tenant information
interface TenantInfo {
  id: string;
  slug: string;
  customDomain: string | null;
}

/**
 * Validates and normalizes the host header to prevent injection attacks
 */
function normalizeAndValidateHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;

  const raw = hostHeader.toLowerCase().trim();

  // Security: Validate host format
  const hostRegex = /^[a-z0-9.-]+(?::\d{1,5})?$/;
  const maxLength = 253;

  if (!hostRegex.test(raw) || raw.length > maxLength) {
    console.warn(`Invalid host header rejected: ${raw}`);
    return null;
  }

  // Security: Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<|>/, // HTML injection
    /['"`]/, // Quote injection
    /[{}]/, // Template injection
    /javascript:/i, // JavaScript protocol
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(raw))) {
    console.warn(`Suspicious host header rejected: ${raw}`);
    return null;
  }

  // Normalize: Remove port and trailing dot, handle www
  const host = raw.split(":")[0].replace(/\.$/, "");
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * Validates tenant slug to prevent path collision and security issues
 */
function isSlugValid(slug: string): boolean {
  // Check reserved slugs
  if (RESERVED_SLUGS.has(slug)) {
    return false;
  }

  // Validate format: lowercase alphanumeric with hyphens, 3-63 characters
  const slugRegex = /^[a-z0-9-]{3,63}$/;
  if (!slugRegex.test(slug)) {
    return false;
  }

  // Additional security checks
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) {
    return false; // No leading/trailing hyphens or double hyphens
  }

  return true;
}

/**
 * Resolves tenant information from hostname with caching and timeout
 */
async function resolveTenantByHostname(
  hostname: string,
): Promise<TenantInfo | null> {
  const url = new URL("/api/internal/tenant/resolve", BASE_URL);

  // Handle subdomain-based tenant resolution
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -`.${ROOT_DOMAIN}`.length);
    if (slug && isSlugValid(slug)) {
      url.searchParams.set("slug", slug);
    } else {
      console.warn(`Invalid tenant slug: ${slug}`);

      return null;
    }
  }

  url.searchParams.set("hostname", hostname);

  // Setup timeout for fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const headers: HeadersInit = {};

    // Use internal API secret if configured
    if (INTERNAL_API_SECRET) {
      headers["x-internal-secret"] = INTERNAL_API_SECRET;
    } else {
      // Fallback to less secure header (for backward compatibility)
      headers["x-internal-call"] = "tenant-resolver";
    }

    const response = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
      cache: "no-store", // Still no cache at HTTP level, we handle caching in memory
    });

    if (response.ok) {
      const tenant = (await response.json()) as TenantInfo;

      // Validate tenant data
      if (tenant.slug && !isSlugValid(tenant.slug)) {
        console.error(`Invalid slug returned from API: ${tenant.slug}`);

        return null;
      }

      return tenant;
    } else {
      if (response.status !== 404) {
        console.error(
          `Tenant resolution failed with status: ${response.status}`,
        );
      }

      return null;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(`Tenant resolution timeout for ${hostname}`);
      } else {
        console.error(
          `Tenant resolution error for ${hostname}:`,
          error.message,
        );
      }
    }

    // Don't cache errors - they might be transient
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main middleware function
 */
export async function middleware(req: NextRequest) {
  const startTime = Date.now();
  const { pathname, search } = req.nextUrl;

  // Validate and normalize host
  const originalHost = normalizeAndValidateHost(req.headers.get("host"));
  if (!originalHost) {
    console.error("Invalid or missing host header");
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Skip processing for root domain
  if (originalHost === ROOT_DOMAIN) {
    return NextResponse.next();
  }

  // Resolve tenant
  const tenant = await resolveTenantByHostname(originalHost);
  if (!tenant) {
    // Return generic error to prevent information leakage
    return new NextResponse("Not Found", { status: 404 });
  }

  // Create new headers with tenant information
  const requestHeaders = new Headers(req.headers);
  const timestamp = Date.now();

  // Set tenant headers
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-slug", tenant.slug);
  requestHeaders.set("x-tenant-domain", tenant.customDomain ?? originalHost);
  requestHeaders.set("x-tenant-timestamp", timestamp.toString());

  // Add performance tracking header
  requestHeaders.set("x-middleware-start", startTime.toString());

  // Check if the path already includes the tenant slug or is an allowed path
  if (
    pathname.startsWith(`/s/${tenant.slug}`) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/healthz")
  ) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Rewrite to tenant-specific path
  const url = req.nextUrl.clone();
  url.pathname = `/s/${tenant.slug}${pathname}`;
  url.search = search;

  // Log performance metrics
  const duration = Date.now() - startTime;
  if (duration > 100) {
    console.warn(
      `Slow middleware execution: ${duration}ms for ${originalHost}`,
    );
  }

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /_next (Next.js internals)
     * 2. /static (static assets)
     * 3. /.well-known (SSL/ACME challenges)
     * 4. Files with extensions (e.g., .ico, .png, .jpg)
     * 5. Common root files (favicon.ico, robots.txt, sitemap.xml)
     */
    "/((?!_next|static|.well-known|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
