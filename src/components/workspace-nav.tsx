import Link from "next/link";

export function WorkspaceNav({
  active,
}: {
  active: "interests" | "profile" | "career" | "account";
}) {
  return (
    <header className="workspace-header">
      <Link className="workspace-brand" href="/">
        Employ<span>HER</span>
        <i aria-hidden="true" />
      </Link>
      <nav aria-label="Your workspace">
        <Link
          href="/onboarding"
          aria-current={active === "interests" ? "page" : undefined}
        >
          Your interests
        </Link>
        <Link
          href="/profile"
          aria-current={active === "profile" ? "page" : undefined}
        >
          Your résumé
        </Link>
        {active === "career" && (
          <a href="#career-plan" aria-current="page">
            Career plan
          </a>
        )}
        <Link
          href="/account"
          aria-current={active === "account" ? "page" : undefined}
        >
          My account
        </Link>
        <a href="/auth/logout">Log out</a>
      </nav>
    </header>
  );
}
