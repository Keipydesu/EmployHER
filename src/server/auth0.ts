import { Auth0Client } from "@auth0/nextjs-auth0/server";

// APP_BASE_URL is not Auth0-specific -- checkOrigin() also uses it as the
// canonical CSRF origin, and CI/Playwright set it alone with no intent to
// configure sign-in. Only these four values indicate Auth0 intent.
const AUTH0_CREDENTIALS = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
] as const;

/**
 * Auth0 is optional: the synthetic demo and CI run without credentials.
 * Only a completely empty credential set counts as not configured. A partial
 * set (including a missing APP_BASE_URL once any credential is set) is a
 * misconfiguration, so the client is still built and the SDK reports the
 * missing variable rather than silently leaving sign-in switched off.
 */
export const isAuth0Configured = AUTH0_CREDENTIALS.some(
  (name) => process.env[name],
);

export const auth0 = isAuth0Configured ? new Auth0Client() : null;
