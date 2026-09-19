import Link from "next/link";
import { auth0 } from "../src/server/auth0";

const steps = [
  [
    "01",
    "Recognize your experience",
    "Start with what you have learned, built, and contributed.",
  ],
  [
    "02",
    "Explore your possibilities",
    "Find tech paths and opportunities connected to your experience.",
  ],
  [
    "03",
    "Choose your next step",
    "Turn the qualifications you want to develop into practical actions.",
  ],
];

export default async function Home() {
  const session = auth0 ? await auth0.getSession() : null;

  return (
    <main>
      <header>
        <Link href="/" aria-label="EmployHER home">
          Employ<span>HER</span>
        </Link>
        <nav className="site-nav" aria-label="Account">
          <span className="badge">In development</span>
          {session && (
            <>
              <span className="who">
                {session.user.email ?? session.user.name}
              </span>
              {/* Ends the session and redirects to Auth0 to log out */}
              <a href="/auth/logout">Log out</a>
            </>
          )}
          {auth0 && !session && (
            <>
              {/* Redirects to Auth0 Universal Login */}
              <a href="/auth/login">Log in</a>
              <a
                className="cta"
                href="/auth/login?screen_hint=signup&returnTo=/onboarding"
              >
                Sign up
              </a>
            </>
          )}
        </nav>
      </header>
      <section className="intro">
        <p className="eyebrow">A career navigator for your next chapter</p>
        <h1>
          Your experience.
          <br />
          <em>Your possibilities.</em>
        </h1>
        <p className="lead">
          Discover where your skills can take you—and a practical next step
          toward a career in tech.
        </p>
        <Link className="demo-link" href="/demo/profile">
          Review a sample résumé →
        </Link>
        <Link className="demo-link" href="/opportunities">
          Explore the synthetic demo →
        </Link>
      </section>
      <section className="steps" aria-label="The planned journey">
        {steps.map(([number, title, description]) => (
          <article key={number}>
            <span className="number">{number}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
      <footer>
        Explore the working synthetic Opportunities demo. Real profile intake
        and provider integrations remain in development.
      </footer>
    </main>
  );
}
