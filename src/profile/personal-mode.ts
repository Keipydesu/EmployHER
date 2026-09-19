import { ProfileError } from "./errors";

export const PERSONAL_CONSENT_VERSION = "local-resume-v1";

// Explicit opt-in for the local MVP only. Hosted deployments stay disabled.
export function personalResumeEnabled(env = process.env): boolean {
  if (env.PERSONAL_RESUME_ENABLED !== "true" || env.VERCEL) return false;
  try {
    const url = new URL(env.APP_BASE_URL ?? "");
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function requirePersonalConsent(request?: Request) {
  if (request?.headers.get("x-resume-consent") !== PERSONAL_CONSENT_VERSION)
    throw new ProfileError(
      "CONSENT_REQUIRED",
      400,
      "Confirm résumé processing before uploading.",
    );
}
