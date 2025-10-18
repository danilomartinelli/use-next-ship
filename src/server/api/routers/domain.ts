import { TRPCError } from "@trpc/server";
import z from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

function assertCustomDomain<T extends { customDomain: string | null }>(
  org?: T,
): asserts org is T & { customDomain: string } {
  if (!org || org.customDomain === null) {
    throw new Error("No organization found for the provided domain.", {
      cause: "NO_ORG_FOUND",
    });
  }
}

export const domainRouter = createTRPCRouter({
  /**
   * Get organization info by provided custom domain
   */
  getOrganizationByDomain: publicProcedure
    .input(
      z.object({
        domain: z.url(),
      }),
    )
    .query(async ({ ctx: { db }, input: { domain: customDomain } }) => {
      try {
        const currentOrg = await db.query.organization.findFirst({
          where: (organization, { eq }) =>
            eq(organization.customDomain, customDomain),
        });

        // Assert that the organization with the custom domain exists
        assertCustomDomain(currentOrg);

        return currentOrg;
      } catch (error) {
        if (error instanceof Error && error.cause === "NO_ORG_FOUND") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch organization by custom domain.",
          cause: error,
        });
      }
    }),
});
