"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const paths = [
  {
    icon: "</>",
    name: "Software engineering",
    text: "Build the things people use.",
    tags: "Web · Apps · Products",
  },
  {
    icon: "⌁",
    name: "Cloud engineering",
    text: "Make big ideas run reliably.",
    tags: "Infrastructure · Systems",
  },
  {
    icon: "▥",
    name: "Data science",
    text: "Find the story in the numbers.",
    tags: "Analysis · Research · Insights",
  },
];

export function ResumeJourney() {
  const journey = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = journey.current;
    const document = paper.current;
    if (!container || !document) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reduced.matches || mobile.matches) {
        document.style.transform = "";
        return;
      }
      const traveled = Math.max(
        0,
        -container.getBoundingClientRect().top + 100,
      );
      const progress = Math.min(
        1,
        traveled / (container.offsetHeight - window.innerHeight),
      );
      const shift = Math.sin((Math.min(progress * 2, 1) * Math.PI) / 2);
      document.style.transform = `translateX(${-shift * Math.min(window.innerWidth * 0.245, 330)}px) scale(${1 - shift * 0.17}) rotate(${-3 + shift * 5}deg)`;
      container.style.setProperty("--journey-progress", String(progress));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    reduced.addEventListener("change", queue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      reduced.removeEventListener("change", queue);
    };
  }, []);

  return (
    <>
      <section className="home-hero" id="journey">
        <p className="home-kicker">
          <span /> YOUR NEXT CHAPTER STARTS HERE
        </p>
        <h1>
          You’re more than
          <br />a résumé<span className="home-period">.</span>
        </h1>
        <p className="home-hero-copy">
          You’ve built skills. Collected experience. Made things happen.
          <br className="home-desktop-break" /> Let’s see where it can take you.
        </p>
        <Link href="/profile" className="home-button">
          Add your résumé <span aria-hidden="true">↑</span>
        </Link>
        <p className="home-caption">
          PDF or pasted text · Review every skill before you confirm
        </p>
        <a href="#skills" className="home-scroll">
          Follow the possibilities <span aria-hidden="true">↓</span>
        </a>
      </section>

      <div className="home-journey" ref={journey}>
        <div className="home-paper-stage" aria-hidden="true">
          <div className="home-paper" ref={paper}>
            <div className="home-paper-top">
              <span>THE START OF SOMETHING</span>
              <span>↗</span>
            </div>
            <div className="home-paper-name">
              Alex Morgan<span>Curious mind. Problem solver. Builder.</span>
            </div>
            <div className="home-paper-rule" />
            <div className="home-paper-section">EXPERIENCE</div>
            <strong>Student research assistant</strong>
            <small>University research lab · 2024–2025</small>
            <p>
              Used Python to analyze survey responses and share findings with
              the research team.
            </p>
            <div className="home-paper-lines">
              <i />
              <i />
            </div>
            <strong>Community project volunteer</strong>
            <small>Local learning initiative · 2023–2024</small>
            <p>
              Coordinated weekly workshops and helped a team bring new ideas to
              life.
            </p>
            <div className="home-paper-section">EDUCATION</div>
            <strong>B.S. Computer Science</strong>
            <div className="home-paper-lines">
              <i />
            </div>
            <div className="home-paper-section">SKILLS</div>
            <div className="home-paper-tags">
              <span>Python</span>
              <span>Research</span>
              <span>Teamwork</span>
            </div>
            <div className="home-paper-bottom">
              <span>YOUR EXPERIENCE HAS POTENTIAL.</span>
              <span>01</span>
            </div>
            <span className="home-sample-label">Illustrative résumé</span>
          </div>
        </div>

        <div className="home-paper-intro">
          <span>
            One document.
            <br />
            <b>So many starting points.</b>
          </span>
          <span className="home-orbit-label">Your story, in motion ↘</span>
        </div>
        <section className="home-story-section" id="skills">
          <div className="home-story-copy">
            <p className="home-kicker">01 / SEE YOURSELF CLEARLY</p>
            <h2>
              You already
              <br />
              bring a lot.
            </h2>
            <p>
              The projects, the part-time jobs, the things you figured out along
              the way. There are skills in all of it.
            </p>
            <div className="home-skill-pills">
              <span>↗ Problem solving</span>
              <span>⌘ Python</span>
              <span>✳ Research</span>
            </div>
            <div className="home-evidence">
              <span className="home-evidence-label">
                CONNECTED TO YOUR EXPERIENCE
              </span>
              <p>“Used Python to analyze survey responses…”</p>
              <span className="home-evidence-foot">
                Sample evidence → Python · Data analysis
              </span>
            </div>
            <p className="home-small">
              You review, edit, and confirm. Your story stays yours.
            </p>
          </div>
        </section>
        <section className="home-story-section" id="directions">
          <div className="home-story-copy">
            <p className="home-kicker">02 / EXPAND YOUR POSSIBILITIES</p>
            <h2>
              One beginning.
              <br />
              Many directions.
            </h2>
            <p>
              Explore paths in tech. See what connects to your experience and
              what you could learn next.
            </p>
            <div className="home-paths">
              {paths.map((path) => (
                <Link
                  href="/opportunities"
                  className="home-path"
                  key={path.name}
                >
                  <span className="home-path-icon" aria-hidden="true">
                    {path.icon}
                  </span>
                  <div>
                    <h3>{path.name}</h3>
                    <p>{path.text}</p>
                    <small>{path.tags}</small>
                  </div>
                  <span className="home-path-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              ))}
            </div>
            <p className="home-small">
              Explore example paths. These aren’t personalized matches.
            </p>
          </div>
        </section>
        <section
          className="home-story-section home-last-section"
          id="next-step"
        >
          <div className="home-story-copy">
            <p className="home-kicker">03 / MOVE FORWARD</p>
            <h2>
              A next step.
              <br />
              That feels like you.
            </h2>
            <p>
              You don’t need the whole journey figured out. Start with a clearer
              picture of what you bring.
            </p>
            <ol className="home-checklist">
              <li>
                <span>01</span>Review your experience
              </li>
              <li>
                <span>02</span>Explore a career path
              </li>
              <li>
                <span>03</span>Choose something to work toward
              </li>
            </ol>
            <Link href="/profile" className="home-button">
              Find my starting point <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <div className="home-progress" aria-hidden="true">
          <span />
        </div>
      </div>
      <section className="home-outro">
        <p className="home-kicker">LESS GUESSWORK. MORE POSSIBILITY.</p>
        <h2>
          Your experience.
          <br />
          <span>Your possibilities.</span>
        </h2>
        <Link href="/demo" className="home-button">
          Try the interactive demo <span aria-hidden="true">↗</span>
        </Link>
        <p className="home-small">
          Explore with a sample résumé in the local demo.
        </p>
      </section>
    </>
  );
}
