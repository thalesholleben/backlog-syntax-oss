import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "@/lib/env";

/**
 * Better Auth owns identity and sessions (ADR 0002). The browser talks to it directly at
 * `${NEXT_PUBLIC_API_URL}/api/auth/*` with the session cookie; the web app never mints or
 * forwards MCP tokens for human sessions.
 */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  basePath: "/api/auth",
  plugins: [
    inferAdditionalFields({
      user: {
        termsAcceptedAt: { type: "date", required: false, input: true },
        privacyNoticeAcceptedAt: { type: "date", required: false, input: true },
        legalNoticeVersion: { type: "string", required: false, input: true },
      },
    }),
    oauthProviderClient(),
  ],
});

// tsc rejects destructuring `authClient` directly into a single export statement: the inferred
// type of `useSession` cannot be named portably. Re-exporting each property individually avoids
// that without changing behavior.
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const requestPasswordReset = authClient.requestPasswordReset;
export const changePassword = authClient.changePassword;
export const resetPassword = authClient.resetPassword;
export function useSession(): ReturnType<typeof authClient.useSession> {
  return authClient.useSession();
}
