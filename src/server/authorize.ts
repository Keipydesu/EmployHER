import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { ProfileError } from "../profile/errors";
import { auth0 } from "./auth0";
import { getDb } from "./db";
import { users } from "./schema";

function pilotAllowedSubs(): Set<string> {
  return new Set(
    (process.env.PILOT_ALLOWED_AUTH0_SUBS ?? "")
      .split(",")
      .map((sub) => sub.trim())
      .filter(Boolean),
  );
}

async function resolveOwner(
  request: Request,
): Promise<{ id: string; auth0Sub: string }> {
  if (!auth0)
    throw new ProfileError(
      "PLATFORM_NOT_CONFIGURED",
      503,
      "Authentication is not configured.",
    );
  // Route Handlers hand this function a NextRequest even though `authorize`'s
  // port type is the plain fetch `Request`; only the SDK needs the narrower type.
  const session = await auth0.getSession(request as unknown as NextRequest);
  if (!session)
    throw new ProfileError("UNAUTHENTICATED", 401, "Sign in to continue.");
  const auth0Sub = session.user.sub;
  const db = getDb();
  // Auto-provision on first sight: Auth0 owns identity, this just mints the
  // internal UUID every domain table (profiles, operations) references.
  await db.insert(users).values({ auth0Sub }).onConflictDoNothing();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.auth0Sub, auth0Sub));
  if (!user || user.deletedAt)
    throw new ProfileError(
      "UNAUTHENTICATED",
      401,
      "This account is no longer available.",
    );
  return { id: user.id, auth0Sub: user.auth0Sub };
}

// Stopgap per-owner daily write cap until a real quota service exists.
// In-process only: acceptable for a single-instance pilot, not a distributed
// quota guarantee. Mirrors the demo harness's per-session cap (30 writes).
const WRITE_LIMIT = 30;
const WRITE_WINDOW_MS = 86_400_000;
const writeCounts = new Map<string, { count: number; resetAt: number }>();

export async function authorize(
  request: Request,
  operation: "read" | "write",
): Promise<string> {
  const { id } = await resolveOwner(request);
  if (operation === "write") {
    const now = Date.now();
    const entry = writeCounts.get(id);
    if (!entry || entry.resetAt < now) {
      writeCounts.set(id, { count: 1, resetAt: now + WRITE_WINDOW_MS });
    } else if (++entry.count > WRITE_LIMIT) {
      throw new ProfileError(
        "RATE_LIMITED",
        429,
        "The daily request limit was reached.",
      );
    }
  }
  return id;
}

// Stopgap pilot gating until a real consent flow exists: an env allowlist of
// Auth0 subs. See docs/implementation/person-a.md's authorizeIntake contract.
export async function authorizeIntake(
  owner: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- port shape requires it; the stopgap allowlist doesn't inspect text
  _text: string,
): Promise<void> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, owner));
  if (!user || !pilotAllowedSubs().has(user.auth0Sub))
    throw new ProfileError(
      "PILOT_NOT_ENABLED",
      403,
      "Real résumé intake is limited to pilot accounts.",
    );
}
