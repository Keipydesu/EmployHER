import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-16">
      <p className="text-sm font-semibold text-purple-800">404</p>
      <h1 className="mt-4 text-4xl font-semibold">This page isn’t here.</h1>
      <p className="mt-4 text-stone-600">
        Return to the overview to explore EmployHER.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block font-medium text-purple-800 underline underline-offset-4"
      >
        Back to overview
      </Link>
    </section>
  );
}
