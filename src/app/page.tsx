const steps = [
  {
    title: "Start with your story",
    description:
      "Review the skills and experience you already bring, with room to make corrections.",
  },
  {
    title: "Explore your possibilities",
    description:
      "Discover early-career tech roles and see which qualifications your experience supports.",
  },
  {
    title: "Choose your next step",
    description:
      "Find practical actions and sourced learning and community resources for your goals.",
  },
];

export default function HomePage() {
  return (
    <>
      <section aria-labelledby="welcome-heading" className="max-w-3xl">
        <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-purple-800">
          Your next chapter in tech
        </p>
        <h1
          id="welcome-heading"
          className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl"
        >
          Build on what you know.
          <br />
          Discover where you can go.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
          A career navigator designed to connect your experience with
          opportunities, clear next steps, and support along the way.
        </p>
        <a
          href="#journey"
          className="mt-8 inline-flex rounded-full bg-purple-900 px-6 py-3 font-medium text-white hover:bg-purple-800"
        >
          Explore the planned journey{" "}
          <span aria-hidden="true" className="ml-3">
            →
          </span>
        </a>
      </section>
      <aside
        aria-label="Preview status"
        className="mt-12 rounded-2xl border border-purple-200 bg-purple-50 px-6 py-5 text-sm leading-6 text-purple-950"
      >
        <strong>Foundation preview.</strong> The experience below is planned.
        Sign-in, résumé intake, and job matching are not available yet. This
        preview does not collect or save personal information.
      </aside>
      <section
        id="journey"
        aria-labelledby="journey-heading"
        className="mt-20 scroll-mt-8"
      >
        <h2
          id="journey-heading"
          className="text-3xl font-semibold tracking-tight"
        >
          A little clarity. A next step.
        </h2>
        <p className="mt-3 text-stone-600">
          The journey we’re building with you in mind.
        </p>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-stone-200 bg-white p-7"
            >
              <span className="text-sm font-semibold text-purple-800">
                0{index + 1} / Planned
              </span>
              <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 leading-7 text-stone-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
