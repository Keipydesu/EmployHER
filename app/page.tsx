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
          <Link className="home-nav-about" href="/opportunities">
            Opportunities
          </Link>
          {session ? (
            <a href="/auth/logout">Log out</a>
          ) : auth0 ? (
            <a href="/auth/login">Log in</a>
          ) : null}
          <Link className="home-button home-button-small" href="/profile">
            Get started <span aria-hidden="true">↗</span>
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
        <span>Built around your experience.</span>
      </footer>
    </main>
  );
}
