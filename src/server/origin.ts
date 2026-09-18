import { OpportunityError } from "../opportunities/engine.ts";

// Next normalizes loopback nextUrl to localhost. Compare the browser Origin to
// the actual validated Host header, not that normalized URL.
export function validateLocalOrigin(
  host: string | null,
  protocol: string,
  origin?: string | null,
) {
  let expected: URL;
  try {
    expected = new URL(`${protocol}//${host}`);
  } catch {
    throw new OpportunityError(
      "DEMO_LOCAL_ONLY",
      "Local demo host required.",
      403,
    );
  }
  if (
    !host ||
    !["http:", "https:"].includes(protocol) ||
    expected.host !== host ||
    !["localhost", "127.0.0.1", "[::1]"].includes(expected.hostname)
  )
    throw new OpportunityError(
      "DEMO_LOCAL_ONLY",
      "The synthetic demo is available on localhost only.",
      403,
    );
  if (origin !== undefined && origin !== expected.origin)
    throw new OpportunityError(
      "INVALID_ORIGIN",
      "Reload this page before trying again.",
      403,
    );
  return expected.origin;
}
