import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/server/platform/database.ts";
import { Owners } from "../src/server/platform/owners.ts";
import { PostgresOperations } from "../src/server/platform/operations.ts";
import { PostgresProfileRepository } from "../src/profile/adapters/postgres.ts";
import { ProfileService } from "../src/profile/service.ts";
import { GeminiProfileAI } from "../src/profile/adapters/gemini.ts";
import { resumeFixtures } from "../src/profile/fixtures.ts";
import { AccountInterests } from "../src/server/platform/interests.ts";
import { CareerPlans } from "../src/server/platform/career-plans.ts";
import { ReviewedCatalog } from "../src/server/platform/catalog.ts";
import { CareerService } from "../src/opportunities/career-service.ts";
import { CareerAnalyses } from "../src/server/platform/career-analyses.ts";
import { GeminiCareerAI } from "../src/opportunities/gemini-career.ts";
import { BackboardStorage } from "../src/server/platform/backboard.ts";
import { BackboardSync } from "../src/server/platform/backboard-sync.ts";
import { Lifecycle } from "../src/server/platform/lifecycle.ts";

// Creates only fresh synthetic accounts; never takes an existing owner/profile ID.
// Default: fixture extraction + real database/embedding/catalog services.
// --gemini also requires real extraction and recommendation synthesis.
// --backboard additionally checks remote memory sync and deletion.
async function main() {
  const liveGemini = process.argv.includes("--gemini");
  const liveBackboard = process.argv.includes("--backboard");
  if (
    process.argv
      .slice(2)
      .some((arg) => !["--gemini", "--backboard"].includes(arg))
  )
    throw Error("Unknown smoke option");
  const { pool, db } = createDatabase();
  const owners = new Owners(pool);
  const operations = new PostgresOperations(pool);
  const repo = new PostgresProfileRepository(
    db,
    (tx, p) => operations.completeProfile(tx, p),
    (tx) => operations.lockOwner(tx),
  );
  const interests = new AccountInterests(db, operations);
  const plans = new CareerPlans(db, operations);
  const catalog = new ReviewedCatalog(pool);
  const lifecycle = new Lifecycle(pool);
  const memory = new BackboardSync(
    pool,
    new BackboardStorage(process.env.BACKBOARD_API_KEY ?? ""),
    !!process.env.BACKBOARD_API_KEY,
  );
  const provider = new GeminiProfileAI(
    process.env.GEMINI_API_KEY ?? "",
    process.env.GEMINI_MODEL ?? "",
    process.env.GEMINI_EMBEDDING_MODEL ?? "",
  );
  const fixture = resumeFixtures[0];
  const ai = liveGemini
    ? provider
    : {
        model: "supplied-synthetic-extraction",
        extract: async () => ({ facts: fixture.facts }),
        embed: (text: string, signal: AbortSignal) =>
          provider.embed(text, signal),
      };
  const profileService = new ProfileService(repo, ai, operations, {
    getReviewedPath: async () => null,
  });
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
      authorize: async () => {}, // Only the freshly created synthetic profile below is used.
    },
    interests,
  );
  const created: string[] = [];
  try {
    const identity = {
      issuer: "https://employher-service-smoke.invalid",
      subject: randomUUID(),
    };
    const owner = await owners.resolve(identity);
    created.push(owner);
    const other = await owners.resolve({ ...identity, subject: randomUUID() });
    created.push(other);
    await interests.update(
      owner,
      { expectedVersion: 0, fields: ["ml"] },
      randomUUID(),
    );
    const draft = await profileService.intake(
      owner,
      randomUUID(),
      fixture.text,
    );
    console.log(
      liveGemini
        ? "PASS live Gemini extraction and owned draft persistence"
        : "PASS supplied fixture extraction and owned draft persistence (not live extraction)",
    );
    const confirmed = await profileService.update(
      owner,
      draft.profileId,
      randomUUID(),
      {
        expectedVersion: draft.version,
        corrections: draft.facts.map(
          ({ id, kind, label, detail, dateText }) => ({
            id,
            kind,
            label,
            detail,
            dateText,
          }),
        ),
        confirm: true,
      },
    );
    assert.equal(confirmed.embedding?.simulated, false);
    assert.equal(confirmed.embedding?.values.length, 768);
    assert.equal(await repo.get(other, confirmed.profileId), null);
    assert.equal(
      (await new PostgresProfileRepository(db).get(owner, confirmed.profileId))
        ?.version,
      confirmed.version,
    );
    console.log(
      "PASS real embedding, durable profile reload and cross-owner isolation",
    );
    let view = await career.read(owner, confirmed.profileId, confirmed.version);
    assert.equal(view.saved.plan.pathId, "ml");
    assert(view.guidance.patterns.sampleSize > 0);
    assert(view.matches.every((match) => !("embedding" in match.job)));
    console.log(
      "PASS selected-field catalog retrieval and grounded career context",
    );
    view = await career.update(
      owner,
      confirmed.profileId,
      confirmed.version,
      view.saved.catalogVersion,
      {
        kind: "preferences",
        expectedVersion: view.saved.version,
        preferences: { ...view.saved.preferences, inclusion: ["women"] },
      },
      randomUUID(),
    );
    assert.deepEqual(
      (await career.read(owner, confirmed.profileId, confirmed.version)).saved
        .preferences.inclusion,
      ["women"],
    );
    console.log("PASS durable career preferences");
    if (liveGemini) {
      view = await career.analyze(
        owner,
        confirmed.profileId,
        confirmed.version,
        view.saved.catalogVersion,
        randomUUID(),
      );
      assert(view.analysis?.recommendations.length);
      view = await career.update(
        owner,
        confirmed.profileId,
        confirmed.version,
        view.saved.catalogVersion,
        {
          kind: "select-recommendation",
          expectedVersion: view.saved.version,
          contextHash: view.analysisContextHash,
          index: 0,
        },
        randomUUID(),
      );
      assert.equal(
        (await career.read(owner, confirmed.profileId, confirmed.version)).saved
          .plan.actions.length,
        1,
      );
      console.log(
        "PASS live Gemini synthesis and durable saved recommendation",
      );
    } else
      console.log("NOT RUN live Gemini extraction/synthesis; use --gemini");
    if (liveBackboard) {
      await memory.queue(owner, {
        profileId: confirmed.profileId,
        profileVersion: confirmed.version,
        catalogVersion: view.saved.catalogVersion,
        planVersion: view.saved.version,
        interestVersion: view.interestVersion,
        content: "Synthetic service smoke: practice a small SQL project.",
      });
      await memory.reconcile(1, owner);
      assert.equal((await memory.status(owner)).status, "synced");
      await memory.queue(owner, null);
      await memory.reconcile(1, owner);
      assert.equal((await memory.status(owner)).status, "disabled");
      console.log("PASS live Backboard worker sync and opt-out cleanup");
    } else console.log("NOT RUN live Backboard worker; use --backboard");
    console.log(
      "Service adapter smoke passed. Auth0 login and HTTP/browser journey are separate checks.",
    );
  } finally {
    for (const owner of created) {
      try {
        const deletion = await lifecycle.request(owner);
        await lifecycle.reconcile(1, owner);
        await memory.reconcile(1, owner);
        await pool.query(
          "UPDATE app_deletions SET next_attempt_at=now() WHERE owner_id=$1",
          [owner],
        );
        await lifecycle.reconcile(1, owner);
        assert.equal(
          (await lifecycle.status(owner, deletion.deletionId)).status,
          "completed",
        );
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (const table of [
            "backboard_context",
            "profile_owner_lifecycle",
            "app_deletions",
          ])
            await client.query(`DELETE FROM ${table} WHERE owner_id=$1`, [
              owner,
            ]);
          await client.query("DELETE FROM app_users WHERE id=$1", [owner]);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
        console.log("PASS synthetic account cleanup");
      } catch {
        console.error(
          `Cleanup pending for synthetic owner ${owner}; durable cleanup records retained.`,
        );
        process.exitCode = 1;
      }
    }
    await pool.end();
  }
}
void main().catch((error: unknown) => {
  console.error(
    "Service smoke failed:",
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "CHECK_FAILED",
  );
  process.exitCode = 1;
});
