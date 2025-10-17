import { createAuthClient } from "better-auth/react";
import { env } from "@/env";

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BASE_URL,
});
