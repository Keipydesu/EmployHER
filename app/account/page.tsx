import Link from "next/link";
import { auth0 } from "@/server/auth0";
import { getPlatformServices } from "@/server/platform/bootstrap";
import { AccountData } from "@/components/account-data";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const session = auth0 ? await auth0.getSession() : null;
  if (!session)
    return (
      <main className="opportunities">
        <h1>Your account data</h1>
        <a href="/auth/login?returnTo=/account">Sign in to manage your data</a>
      </main>
    );
  if (process.env.PLATFORM_ENABLED !== "true")
    return (
      <main className="opportunities">
        <h1>Your account data</h1>
        <p>Account storage is not configured on this instance.</p>
      </main>
    );
  const platform = getPlatformServices();
  const owner = await platform.authorize(false, true);
  return (
    <main className="opportunities">
      <header>
        <Link href="/">EmployHER</Link>
        <a href="/auth/logout">Log out</a>
      </header>
      <h1>Your account data</h1>
      <AccountData initial={await platform.lifecycle.latest(owner)} />
    </main>
  );
}
