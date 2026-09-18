import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "./src/server/auth0";

export async function proxy(request: NextRequest) {
  // Without credentials there are no /auth/* routes to mount, so pass the
  // request straight through rather than failing every route in the app.
  if (!auth0) return NextResponse.next();

  // Mounts /auth/login, /auth/logout, /auth/callback, /auth/profile,
  // /auth/access-token, and /auth/backchannel-logout. Always return this
  // response: it forwards non-auth requests on to the app routes.
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
