import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BASE_URL,
  plugins: [
    organizationClient({
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
