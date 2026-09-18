import Link from 'next/link';
export default function Home() {
  return (
    <main className="landing">
      <span className="brand">
        employ<span>HER</span>
      </span>
      <h1>
        Your next chapter
        <br />
        starts with your experience.
      </h1>
      <p>
        Person A’s profile workspace: review your skills, clarify the evidence, and tell an honest
        résumé story.
      </p>
      <Link className="button" href="/profile">
        Open profile workspace →
      </Link>
    </main>
  );
}
