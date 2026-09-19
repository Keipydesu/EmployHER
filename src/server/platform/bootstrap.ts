import { BackboardStorage } from "./backboard";
import { BackboardSync } from "./backboard-sync";
import { AccountInterests } from "./interests";
import { Lifecycle } from "./lifecycle";
import { CareerPlans } from "./career-plans";
import { ReviewedCatalog } from "./catalog";
import { CareerService } from "../../opportunities/career-service";
import { GeminiCareerAI } from "../../opportunities/gemini-career";
import { CareerAnalyses } from "./career-analyses";
import { auth0 } from "../auth0";
import { createDatabase } from "./database";
import { Owners } from "./owners";
import { PostgresOperations } from "./operations";
import { PostgresProfileRepository } from "../../profile/adapters/postgres";
import { GeminiProfileAI } from "../../profile/adapters/gemini";
import { ProfileService } from "../../profile/service";
import {
  installProfileRuntime,
  GuardedEmbeddingAI,
  allowedFixtureSummaries,
} from "../../profile/runtime";
import { ProfileError } from "../../profile/errors";
import { resumeFixtures } from "../../profile/fixtures";
import {
  prepareText,
  validateEvidence,
  summaryForEmbedding,
} from "../../profile/evidence";
import type { ProfileAI } from "../../profile/ports";
import {
  PERSONAL_CONSENT_VERSION,
  personalResumeEnabled,
  requirePersonalConsent,
} from "../../profile/personal-mode";
const fixtureOnly = () =>
  new ProfileError(
    "FIXTURE_ONLY",
    403,
    "Only supplied synthetic inputs are enabled until personal-data release verification.",
  );
type PlatformServices = {
  owners: Owners;
  interests: AccountInterests;
  memory: BackboardSync;
  lifecycle: Lifecycle;
  career: CareerService;
  authorize: (write?: boolean, allowDeleted?: boolean) => Promise<string>;
};
const globalPlatform = globalThis as typeof globalThis & {
  employherPlatform?: PlatformServices;
  employherCleanupTimer?: ReturnType<typeof setInterval>;
};
export function getPlatformServices() {
  if (!globalPlatform.employherPlatform)
    throw new ProfileError(
      "PLATFORM_NOT_CONFIGURED",
      503,
      "The application platform is not configured.",
    );
  return globalPlatform.employherPlatform;
}
export function initializePlatform() {
  if (
    process.env.PLATFORM_ENABLED !== "true" ||
    globalPlatform.employherPlatform
  )
    return;
  if (!auth0)
    throw new ProfileError(
      "PLATFORM_NOT_CONFIGURED",
      503,
      "Configure Auth0 before enabling the platform.",
    );
  const authClient = auth0;
  const { pool, db } = createDatabase();
  const owners = new Owners(pool);
  const lifecycle = new Lifecycle(pool);
  const memory = new BackboardSync(
    pool,
    new BackboardStorage(process.env.BACKBOARD_API_KEY ?? ""),
    !!process.env.BACKBOARD_API_KEY,
  );
  const authorize = async (write = false, allowDeleted = false) => {
    const session = await authClient.getSession();
    const subject = session?.user.sub;
    const domain = process.env.AUTH0_DOMAIN ?? "";
    const issuer = new URL(
      domain.startsWith("https://") ? domain : `https://${domain}`,
    ).origin;
    return owners.resolve(
      typeof subject === "string" ? { issuer, subject } : null,
      write,
      allowDeleted,
    );
  };
  const operations = new PostgresOperations(pool);
  const interests = new AccountInterests(db, operations);
  const repo = new PostgresProfileRepository(
    db,
    (tx, p) => operations.completeProfile(tx, p),
    (tx) => operations.lockOwner(tx),
  );
  const catalog = new ReviewedCatalog(pool);
  const plans = new CareerPlans(db, operations);
  const live = new GeminiProfileAI(
    process.env.GEMINI_API_KEY ?? "",
    process.env.GEMINI_MODEL ?? "",
    process.env.GEMINI_EMBEDDING_MODEL ?? "",
  );
  const personal = personalResumeEnabled();
  // Default-off fixture boundary; local personal mode is explicit and disclosed.
  const rejecting: ProfileAI = {
    model: "fixture-boundary",
    extract: async () => {
      throw fixtureOnly();
    },
    embed: async () => {
      throw fixtureOnly();
    },
  };
  const allowed = allowedFixtureSummaries();
  const career = new CareerService(
    repo,
    plans,
    catalog,
    process.env.GEMINI_EMBEDDING_MODEL ?? "",
    {
      ai: new GeminiCareerAI(
        process.env.GEMINI_API_KEY ?? "",
        process.env.GEMINI_MODEL ?? "",
      ),
      store: new CareerAnalyses(db, operations),
      authorize: async (profile) => {
        if (!personal && !allowed.has(summaryForEmbedding(profile.facts)))
          throw fixtureOnly();
      },
    },
    interests,
  );
  const guarded = new GuardedEmbeddingAI(live, rejecting, allowed);
  const ai: ProfileAI = {
    model: live.model,
    extract: async (text, signal) => {
      if (
        !personal &&
        !resumeFixtures.some((f) => normalized(f.text) === normalized(text))
      )
        throw fixtureOnly();
      const extracted = await live.extract(text, signal);
      allowed.add(summaryForEmbedding(validateEvidence(extracted, text)));
      return extracted;
    },
    embed: (summary, signal) =>
      personal ? live.embed(summary, signal) : guarded.embed(summary, signal),
  };
  const normalized = (text: string) =>
    prepareText(text).replace(/\s+/g, " ").replace(/—/g, "-");
  installProfileRuntime({
    service: new ProfileService(repo, ai, operations, {
      getReviewedPath: async (pathId) => {
        const batch = await catalog.active();
        const path = batch.paths.find(
          (p) => p.id === (pathId === "data" ? "ml" : pathId),
        );
        if (!path) return null;
        return {
          id: path.id,
          title: path.title,
          version: path.version,
          requirements: batch.jobs
            .filter((j) => j.pathId === path.id)
            .flatMap((j) =>
              j.requirements.map((r) => ({
                id: r.id,
                skill: r.skill,
                excerpt: r.excerpt,
              })),
            ),
        };
      },
    }),
    authorize: async (_request, operation) => authorize(operation === "write"),
    authorizeIntake: async (owner, text, request) => {
      if (personal) {
        requirePersonalConsent(request);
        await owners.recordConsent(owner, PERSONAL_CONSENT_VERSION);
        return;
      }
      if (!resumeFixtures.some((f) => normalized(f.text) === normalized(text)))
        throw fixtureOnly();
    },
  });
  globalPlatform.employherPlatform = {
    owners,
    interests,
    memory,
    lifecycle,
    career,
    authorize,
  };
  if (!globalPlatform.employherCleanupTimer) {
    let running = false;
    const clean = async () => {
      if (running) return;
      running = true;
      try {
        await lifecycle.reconcile();
        await memory.reconcile();
        await lifecycle.expire();
      } catch {
        console.error(
          "Application cleanup will retry; no personal records are logged.",
        );
      } finally {
        running = false;
      }
    };
    globalPlatform.employherCleanupTimer = setInterval(
      () => void clean(),
      60_000,
    );
    globalPlatform.employherCleanupTimer.unref();
  }
}
