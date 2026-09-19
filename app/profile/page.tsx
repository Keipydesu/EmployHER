import { redirect } from "next/navigation";
import "./profile.css";
import { ProfileWorkspace } from "@/components/profile-workspace";
import { demoEnabled } from "@/profile/runtime";
import { auth0 } from "../../src/server/auth0";
export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const localDemo = demoEnabled();
  // Only redirect when Auth0 is actually configured to log in to — without
  // it there's nothing to redirect to, and ProfileWorkspace's own
  // "Integration required" state (checked by smoke:profile) still applies.
  if (!localDemo && auth0) {
    const session = await auth0.getSession();
    if (!session) redirect("/auth/login?returnTo=/profile");
  }
  return (
    <div className="profile-demo">
      <ProfileWorkspace
        localDemo={localDemo}
        liveGemini={process.env.PROFILE_DEMO_GEMINI === "true"}
      />
    </div>
  );
}
