import "../../profile/profile.css";
import { ProfileWorkspace } from "@/components/profile-workspace";
import { demoEnabled } from "@/profile/runtime";
export const dynamic = "force-dynamic";
export default function ProfilePage() {
  return (
    <div className="profile-demo">
      <ProfileWorkspace
        localDemo={demoEnabled()}
        liveGemini={process.env.PROFILE_DEMO_GEMINI === "true"}
      />
    </div>
  );
}
