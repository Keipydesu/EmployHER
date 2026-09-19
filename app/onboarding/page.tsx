import Link from "next/link";
import { auth0 } from "@/server/auth0";
import { getPlatformServices } from "@/server/platform/bootstrap";
import { InterestWorkspace } from "@/components/interest-workspace";
import { ProfileError } from "@/profile/errors";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function OnboardingPage() {
  const session = auth0 ? await auth0.getSession() : null;
  if (!session)
    return (
      <main className="opportunities">
        <h1>Choose your interests</h1>
        <a href="/auth/login?returnTo=/onboarding">Sign in to continue</a>
        <p>
          <Link href="/demo/profile">Try the sample demo</Link>
        </p>
      </main>
    );
  if (process.env.PLATFORM_ENABLED !== "true")
    return (
      <main className="opportunities">
        <h1>Account setup is being connected</h1>
        <Link href="/demo/profile">Try the sample demo</Link>
      </main>
    );
  const platform = getPlatformServices();
  let owner: string;
  try {
    owner = await platform.authorize();
  } catch (error) {
    if (error instanceof ProfileError && error.code === "ACCOUNT_DELETING")
      redirect("/account");
    throw error;
  }
  return <InterestWorkspace initial={await platform.interests.read(owner)} />;
}
