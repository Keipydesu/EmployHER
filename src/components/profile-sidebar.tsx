import Link from "next/link";

type IconName = "resume" | "interests" | "plan" | "account" | "logout";

function SidebarIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    resume: "M7 3h7l4 4v14H7V3Zm7 0v5h4M10 12h5m-5 4h5",
    interests:
      "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
    plan: "M5 5h4v4H5V5Zm10 10h4v4h-4v-4ZM9 7h6a2 2 0 0 1 2 2v6M7 12v7m-3-3 3 3 3-3",
    account: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
    logout: "M10 4H4v16h6m5-12 4 4-4 4m-7-4h11",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function ProfileSidebar({
  personal,
  careerHref,
}: {
  personal: boolean;
  careerHref?: string;
}) {
  return (
    <>
      <a className="profile-skip" href="#profile-content">
        Skip to résumé
      </a>
      <aside className="profile-sidebar" aria-label="Résumé workspace">
        <Link
          className="profile-sidebar-brand"
          href="/"
          aria-label="EmployHER home"
        >
          Employ<span>HER</span>
          <i aria-hidden="true" />
        </Link>
        <p className="profile-sidebar-label">YOUR NEXT CHAPTER</p>
        <nav
          className="profile-sidebar-nav"
          aria-label={personal ? "Your workspace" : "Sample workspace"}
        >
          {personal && (
            <Link href="/onboarding">
              <SidebarIcon name="interests" />
              Your interests
            </Link>
          )}
          <Link
            href={personal ? "/profile" : "/demo/profile"}
            aria-current="page"
          >
            <SidebarIcon name="resume" />
            Your résumé
            <span className="profile-nav-dot" aria-hidden="true" />
          </Link>
          {personal ? (
            careerHref ? (
              <Link href={careerHref}>
                <SidebarIcon name="plan" />
                Career plan
              </Link>
            ) : (
              <span className="profile-nav-upcoming">
                <SidebarIcon name="plan" />
                <span>
                  Career plan<small>Review your résumé first</small>
                </span>
              </span>
            )
          ) : (
            <Link href="/demo">
              <SidebarIcon name="plan" />
              Explore the demo
              <span className="profile-nav-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          )}
        </nav>
        <div className="profile-sidebar-encouragement">
          <span aria-hidden="true">✳</span>
          <p>You don’t need to have it all figured out.</p>
          <small>Just a next step that feels like you.</small>
        </div>
        <div className="profile-sidebar-account">
          <div className="profile-sidebar-identity">
            <span className="profile-sidebar-avatar">
              <SidebarIcon name={personal ? "account" : "resume"} />
            </span>
            <div>
              <strong>
                {personal ? "Your workspace" : "Sample workspace"}
              </strong>
              <small>
                {personal
                  ? "Your story, your next step"
                  : "Fictional résumé · no account"}
              </small>
            </div>
          </div>
          {personal ? (
            <div className="profile-sidebar-utilities">
              <Link href="/account">My account</Link>
              <a href="/auth/logout">
                <SidebarIcon name="logout" />
                Log out
              </a>
            </div>
          ) : (
            <Link className="profile-sidebar-entry" href="/onboarding">
              Build a plan with my résumé <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
