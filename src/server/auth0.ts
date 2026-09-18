import { Auth0Client } from "@auth0/nextjs-auth0/server";

const AUTH0_ENV = [
  "APP_BASE_URL",
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
] as const;

/**
 * Auth0 is optional: the synthetic demo and CI run without credentials.
 * Only a completely empty set counts as not configured. A partial set is a
 * misconfiguration, so the client is still built and the SDK reports the
 * missing variable rather than silently leaving sign-in switched off.
 */
export const isAuth0Configured = AUTH0_ENV.some((name) => process.env[name]);

export const auth0 = isAuth0Configured ? new Auth0Client() : null;
