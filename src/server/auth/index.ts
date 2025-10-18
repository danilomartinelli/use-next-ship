import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { env } from "@/env";
import { db } from "@/server/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: env.BETTER_AUTH_URL,
  plugins: [
    organization({
      teams: {
        enabled: true,
        allowRemovingAllTeams: false,
      },
      schema: {
        organization: {
          additionalFields: {
            customDomain: {
              type: "string",
              input: true,
              required: false,
              unique: true,
              description: "Custom domain for the organization",
            },
          },
        },
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
});
