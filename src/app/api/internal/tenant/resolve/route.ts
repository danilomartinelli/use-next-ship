import { eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { organization } from "@/server/db/schema";

/**
 * Internal API endpoint for tenant resolution
 * Protected by x-internal-secret header validation
 */
export async function GET(request: NextRequest) {
  // Validate internal API access
  const internalSecret = request.headers.get("x-internal-secret");
  const internalCall = request.headers.get("x-internal-call");

  // Check if request is from our middleware
  if (process.env.INTERNAL_API_SECRET) {
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (internalCall !== "tenant-resolver") {
    // Fallback for backward compatibility
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const hostname = searchParams.get("hostname");

  if (!slug && !hostname) {
    return NextResponse.json(
      { error: "Missing slug or hostname parameter" },
      { status: 400 },
    );
  }

  try {
    const conditions = [];

    if (slug) {
      conditions.push(eq(organization.slug, slug));
    }

    if (hostname) {
      conditions.push(eq(organization.customDomain, hostname));
    }

    const tenant = await db
      .select({
        id: organization.id,
        slug: organization.slug,
        customDomain: organization.customDomain,
      })
      .from(organization)
      .where(or(...conditions))
      .limit(1)
      .then((rows) => rows[0]);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Return tenant information
    return NextResponse.json({
      id: tenant.id,
      slug: tenant.slug,
      customDomain: tenant.customDomain,
    });
  } catch (error) {
    console.error("Tenant resolution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Add support for HEAD requests for health checking
export async function HEAD(request: NextRequest) {
  return GET(request);
}
