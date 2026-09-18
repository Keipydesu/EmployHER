import Link from "next/link";

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

export default function Home() {
  return (
    <main>
      <header>
        <Link href="/" aria-label="EmployHER home">
          Employ<span>HER</span>
        </Link>
        <span className="badge">In development</span>
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
        This is an early preview. Profile review and opportunity matching are
        coming next.
      </footer>
    </main>
  );
}
