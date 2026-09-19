import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  CareerAnalyses,
  type AnalysisScope,
} from "../../src/server/platform/career-analyses.ts";
import { PostgresOperations } from "../../src/server/platform/operations.ts";
import type { CareerAnalysis } from "../../src/opportunities/gemini-career.ts";
const connectionString = process.env.TEST_DATABASE_URL;
test(
  "Gemini analyses persist, replay without another provider call, and reject late results after plan changes",
  { skip: !connectionString },
  async () => {
    const admin = new Pool({ connectionString });
    const schema = `analyses_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const owner = randomUUID(),
      profile = randomUUID();
    const make = () =>
      new CareerAnalyses(drizzle(pool), new PostgresOperations(pool));
    const scope: AnalysisScope = {
      owner,
      profileId: profile,
      profileVersion: 1,
      catalogVersion: "v1",
      planVersion: 0,
      model: "test",
      contextHash: "context1",
    };
    const result: CareerAnalysis = {
      recommendations: [
        {
          title: "Build a small project",
          kind: "project",
          why: "Practice with a clear deliverable",
          deliverable: "Publish a synthetic example",
          basis: "explore_requirement",
          factIds: [],
          sourceIds: ["source"],
          resourceIds: [],
          learningNeed: "needs_clarification",
          skill: "python",
        },
      ],
    };
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        await readFile("migrations/007-account-interests.sql", "utf8"),
      );
      await pool.query(
        "CREATE TABLE resume_profile_heads(id uuid PRIMARY KEY,owner_id uuid NOT NULL,current_version integer NOT NULL,expires_at timestamptz NOT NULL,UNIQUE(id,owner_id))",
      );
      await pool.query(
        await readFile("migrations/004-career-plans.sql", "utf8"),
      );
      await pool.query(
        await readFile("migrations/006-career-analyses.sql", "utf8"),
      );
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1::uuid,'test',$1::text)",
        [owner],
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,1,now()+interval '1 day')",
        [profile, owner],
      );
      await pool.query(
        "INSERT INTO opportunity_catalog_state VALUES(true,'v1')",
      );
      let calls = 0;
      const work = async () => {
        calls++;
        return result;
      };
      assert.deepEqual(
        await make().generate(scope, "analysis-key", work),
        result,
      );
      assert.deepEqual(await make().read(scope), result);
      assert.deepEqual(
        await make().generate(scope, "analysis-key", work),
        result,
      );
      assert.deepEqual(
        await make().generate(scope, "different-key", work),
        result,
      );
      assert.equal(
        calls,
        1,
        "same context reuses persisted analysis even under another request key",
      );
      await assert.rejects(
        () => make().read({ ...scope, owner: randomUUID() }),
        /unavailable/,
      );
      const entered = Promise.withResolvers<void>(),
        resume = Promise.withResolvers<void>();
      const pending = make().generate(
        { ...scope, contextHash: "context2" },
        "late-analysis",
        async () => {
          entered.resolve();
          await resume.promise;
          return result;
        },
      );
      const rejected = assert.rejects(pending, /inputs changed/);
      try {
        await entered.promise;
        await pool.query(
          "INSERT INTO career_plans(owner_id,profile_id,version,payload) VALUES($1,$2,1,'{}')",
          [owner, profile],
        );
      } finally {
        resume.resolve();
        await rejected;
      }
      assert.equal(
        (
          await pool.query(
            "SELECT 1 FROM career_analyses WHERE context_hash='context2'",
          )
        ).rowCount,
        0,
      );
      await assert.rejects(
        () => make().generate(scope, "analysis-key", work),
        /inputs changed/,
      );
      const startedInterest = Promise.withResolvers<void>();
      const resumeInterest = Promise.withResolvers<void>();
      const interestPending = make().generate(
        {
          ...scope,
          planVersion: 1,
          interestVersion: 0,
          contextHash: "interest-race",
        },
        "interest-race-key",
        async () => {
          startedInterest.resolve();
          await resumeInterest.promise;
          return result;
        },
      );
      const interestRejected = assert.rejects(
        interestPending,
        /interests changed/,
      );
      await startedInterest.promise;
      try {
        await pool.query(
          "UPDATE app_users SET interest_version=1,interest_fields='[\"ml\"]'::jsonb WHERE id=$1",
          [owner],
        );
      } finally {
        resumeInterest.resolve();
        await interestRejected;
      }
      assert.equal(
        (
          await pool.query(
            "SELECT 1 FROM career_analyses WHERE context_hash='interest-race'",
          )
        ).rowCount,
        0,
      );
      await pool.query("DELETE FROM resume_profile_heads WHERE id=$1", [
        profile,
      ]);
      assert.equal(
        (await pool.query("SELECT 1 FROM career_analyses")).rowCount,
        0,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
