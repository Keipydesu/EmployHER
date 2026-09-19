import { redirect } from "next/navigation";
import { getPlatformServices } from "@/server/platform/bootstrap";
import Link from "next/link";
import { auth0 } from "@/server/auth0";
import { ProfileWorkspace } from "@/components/profile-workspace";
import "./profile.css";
export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const session = auth0 ? await auth0.getSession() : null;
  if (session && process.env.PLATFORM_ENABLED === "true") {
    const platform = getPlatformServices();
    const interests = await platform.interests.read(await platform.authorize());
    if (!interests.fields.length) redirect("/onboarding");
    return (
      <div className="profile-demo">
        <ProfileWorkspace localDemo={false} liveGemini={true} authenticated />
      </div>
    );
  }
  return (
    <main className="opportunities">
      <header>
        <Link href="/">EmployHER</Link>
        <span className="badge">Your private career profile</span>
      </header>
      <section className="op-hero">
        <h1>Build your next chapter.</h1>
        <p>
          Use your own résumé to understand your experience and choose useful
          projects, skills and communities.
        </p>
      </section>
      <section className="panel">
        <h2>Integration required</h2>
        <p>
          Personal résumé intake is not enabled yet. Database, consent,
          retention and deletion checks must pass before we process personal
          documents.
        </p>
        {!session && auth0 && (
          <a href="/auth/login?returnTo=/profile">Sign in to your account</a>
        )}
        {session && (
          <p>
            You are signed in. Your account does not enable personal processing
            until the release checks pass.
          </p>
        )}
        <p>
          <Link href="/demo/profile">
            Try a supplied résumé without signing in
          </Link>
        </p>
      </section>
    </main>
  );
}
