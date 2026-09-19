import type { BrowserContext } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export async function signIn(context: BrowserContext, subject: string) {
  // Use the installed SDK's real cookie encryption, with only the harness secret.
  // No production authentication bypass or Auth0 network request is introduced.
  const { encrypt } = await import(
    pathToFileURL(
      resolve("node_modules/@auth0/nextjs-auth0/dist/server/cookies.js"),
    ).href
  );
  const now = Math.floor(Date.now() / 1000);
  const value = await encrypt(
    {
      user: { sub: subject, name: "Synthetic student" },
      tokenSet: { accessToken: "synthetic", expiresAt: now + 3600 },
      internal: { sid: subject, createdAt: now },
    },
    "a".repeat(64),
    now + 3600,
  );
  await context.addCookies([
    {
      name: "__session",
      value,
      url: "http://127.0.0.1:3101",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
