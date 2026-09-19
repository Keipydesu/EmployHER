import { randomUUID } from "node:crypto";
import { MemoryOperations, MemoryProfileRepository } from "./adapters/memory";
import { FixtureProfileAI } from "./adapters/fixture-ai";
import { GeminiProfileAI } from "./adapters/gemini";
import { demoPaths, resumeFixtures } from "./fixtures";
import { prepareText, factLine } from "./evidence";
import { ProfileError } from "./errors";
import { ProfileService } from "./service";
import type { ProfileAI } from "./ports";
import type { Embedding } from "./contracts";

// Only exact approved summary text may reach the live provider. Other summaries
// use simulated vectors, preserving correction UX without sending arbitrary text.
export class GuardedEmbeddingAI implements ProfileAI {
  readonly model: string;
  constructor(
    private live: ProfileAI,
    private fallback: ProfileAI,
    private allowedSummaries: ReadonlySet<string>,
  ) {
    this.model = live.model;
  }
  extract(text: string, signal: AbortSignal) {
    return this.live.extract(text, signal);
  }
  embed(summary: string, signal: AbortSignal): Promise<Embedding> {
    return this.allowedSummaries.has(summary)
      ? this.live.embed(summary, signal)
      : this.fallback.embed(summary, signal);
  }
}
export function allowedFixtureSummaries(): Set<string> {
  return new Set(
    resumeFixtures.map((fixture) => fixture.facts.map(factLine).join("\n")),
  );
}

export type ProfileRuntime = {
  service: ProfileService;
  // C resolves Auth0 issuer/sub to an internal UUID, checks deletion/expiry and quotas.
  authorize(request: Request, operation: "read" | "write"): Promise<string>;
  authorizeIntake(owner: string, text: string): Promise<void>;
};
type DemoSession = { owner: string; expires: number; writes: number };
const state = globalThis as typeof globalThis & {
  employherProfileRuntime?: ProfileRuntime;
  employherProfileDemo?: {
    runtime: ProfileRuntime;
    sessions: Map<string, DemoSession>;
  };
};
export function installProfileRuntime(runtime: ProfileRuntime) {
  state.employherProfileRuntime = runtime;
}
export function demoEnabled() {
  return (
    process.env.PROFILE_DEMO_MODE === "true" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL
  );
}
function demoState() {
  if (!demoEnabled())
    throw new ProfileError(
      "PLATFORM_NOT_CONFIGURED",
      503,
      "Person C’s authenticated profile runtime is not connected. The local sample harness is disabled.",
    );
  if (!state.employherProfileDemo) {
    const sessions = new Map<string, DemoSession>();
    const ai =
      process.env.PROFILE_DEMO_GEMINI === "true"
        ? new GuardedEmbeddingAI(
            new GeminiProfileAI(
              process.env.GEMINI_API_KEY ?? "",
              process.env.GEMINI_MODEL ?? "",
              process.env.GEMINI_EMBEDDING_MODEL ?? "",
            ),
            new FixtureProfileAI(),
            allowedFixtureSummaries(),
          )
        : new FixtureProfileAI();
    state.employherProfileDemo = {
      sessions,
      runtime: {
        service: new ProfileService(
          new MemoryProfileRepository(),
          ai,
          new MemoryOperations(),
          {
            getReviewedPath: async (id) =>
              demoPaths.find((p) => p.id === id) ?? null,
          },
        ),
        async authorize(request, operation) {
          const token = request.headers
            .get("cookie")
            ?.match(/(?:^|;\s*)profile_demo=([a-f0-9-]+)/)?.[1];
          const session = token ? sessions.get(token) : undefined;
          if (!session || session.expires < Date.now())
            throw new ProfileError(
              "UNAUTHENTICATED",
              401,
              "Start a local sample session first.",
            );
          if (operation === "write" && ++session.writes > 30)
            throw new ProfileError(
              "RATE_LIMITED",
              429,
              "The local demo request limit was reached.",
            );
          return session.owner;
        },
        async authorizeIntake(_owner, text) {
          // This check also applies when testing the real Gemini adapter.
          const normalized = prepareText(text)
            .replace(/\s+/g, " ")
            .replace(/—/g, "-");
          if (
            !resumeFixtures.some(
              (f) =>
                prepareText(f.text).replace(/\s+/g, " ").replace(/—/g, "-") ===
                normalized,
            )
          ) {
            throw new ProfileError(
              "FIXTURE_ONLY",
              403,
              "Use a supplied synthetic résumé. Real intake is disabled in this harness.",
            );
          }
        },
      },
    };
  }
  return state.employherProfileDemo;
}
export function getProfileRuntime(): ProfileRuntime {
  if (!state.employherProfileRuntime)
    throw new ProfileError(
      "PLATFORM_NOT_CONFIGURED",
      503,
      "The authenticated profile runtime is not configured.",
    );
  return state.employherProfileRuntime;
}
export function getDemoProfileRuntime(): ProfileRuntime {
  return demoState().runtime;
}
export function createDemoSession(): string {
  const { sessions } = demoState();
  for (const [key, session] of sessions)
    if (session.expires < Date.now()) sessions.delete(key);
  if (sessions.size >= 100)
    throw new ProfileError(
      "RATE_LIMITED",
      429,
      "Too many local sample sessions. Restart the harness.",
    );
  const token = randomUUID();
  sessions.set(token, {
    owner: randomUUID(),
    expires: Date.now() + 3600_000,
    writes: 0,
  });
  return token;
}
