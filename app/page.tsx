import Link from "next/link";
import { auth0 } from "../src/server/auth0";
import { ResumeJourney } from "./resume-journey";
import "./home.css";

export default async function Home() {
  const session = auth0 ? await auth0.getSession() : null;
  return (
    <main className="home-page">
      <a className="home-skip" href="#journey">
        Skip to content
      </a>
      <header className="home-header">
        <Link className="home-brand" href="/">
          Employ<span>HER</span>
          <i />
        </Link>
        <nav aria-label="Main navigation" className="home-nav">
          <a className="home-nav-about" href="#skills">
            How it works
          </a>
          <Link className="home-nav-about" href="/onboarding">
            Build my career
          </Link>
          {session ? (
            <>
              <Link href="/account">My account</Link>
              <a href="/auth/logout">Log out</a>
            </>
          ) : auth0 ? (
            <a href="/auth/login?returnTo=/onboarding">Log in</a>
          ) : null}
          <Link className="home-button home-button-small" href="/demo">
            Try the demo <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>
      <ResumeJourney />
      <footer className="home-footer">
        <Link className="home-brand" href="/">
          EmployHER
          <i />
        </Link>
        <p>More women. More possibilities.</p>
        <nav aria-label="Sample workspaces">
          <Link href="/demo/profile">Sample résumé</Link>
          <Link href="/opportunities">Sample opportunities</Link>
        </nav>
      </footer>
    </main>
  );
}
