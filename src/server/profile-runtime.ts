import { installProfileRuntime } from "../profile/runtime";
import { ProfileService } from "../profile/service";
import { PostgresProfileRepository } from "../profile/adapters/postgres";
import { PostgresOperations } from "../profile/adapters/postgres-operations";
import { GeminiProfileAI } from "../profile/adapters/gemini";
import { demoPaths } from "../profile/fixtures";
import { getDb } from "./db";
import { authorize, authorizeIntake } from "./authorize";

// Real (non-demo) production runtime, wired once at server start. Only
// installs when the required environment is present so local/demo/CI runs
// without these vars keep using runtime.ts's in-memory demo fallback.
export function installRealProfileRuntimeIfConfigured() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_MODEL &&
    process.env.GEMINI_EMBEDDING_MODEL,
  );
  if (!hasDb || !hasGemini) return;

  const db = getDb();
  const ai = new GeminiProfileAI(
    process.env.GEMINI_API_KEY!,
    process.env.GEMINI_MODEL!,
    process.env.GEMINI_EMBEDDING_MODEL!,
  );
  // No real reviewed catalog exists outside Opportunities' own domain yet
  // (its shape doesn't match ReviewedPath). Person B's real catalog
  // integration is separate follow-up work; reuse the same fixture paths
  // the demo harness uses in the meantime.
  const catalog = {
    getReviewedPath: async (id: string) =>
      demoPaths.find((p) => p.id === id) ?? null,
  };
  installProfileRuntime({
    service: new ProfileService(
      new PostgresProfileRepository(db),
      ai,
      new PostgresOperations(db),
      catalog,
    ),
    authorize,
    authorizeIntake,
  });
}
