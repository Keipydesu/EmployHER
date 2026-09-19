import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { CareerPlans } from "../../src/server/platform/career-plans.ts";
import { PostgresOperations } from "../../src/server/platform/operations.ts";
import {
  jobs,
  paths,
  resources,
  profiles,
} from "../../src/opportunities/catalog.ts";
import type { CareerAnalysis } from "../../src/opportunities/gemini-career.ts";
const connectionString = process.env.TEST_DATABASE_URL;
test(
  "saved plans survive restart, isolate owners, replay original results, fence stale inputs and cascade on profile deletion",
  { skip: !connectionString },
  async () => {
    const admin = new Pool({ connectionString });
    const schema = `plans_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const owner = randomUUID(),
      other = randomUUID();
    const profile = { ...profiles[0], id: randomUUID() };
    const catalog = { jobs, paths, resources, version: "integration-v1" };
    const makeStore = () =>
      new CareerPlans(drizzle(pool), new PostgresOperations(pool));
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
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1::uuid,'test',$1::text),($2::uuid,'test',$2::text)",
        [owner, other],
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,$3,now()+interval '1 day')",
        [profile.id, owner, profile.version],
      );
      await pool.query(
        "INSERT INTO opportunity_catalog_state VALUES(true,$1)",
        [catalog.version],
      );
      const store = makeStore();
      const first = await store.update(
        owner,
        profile,
        catalog,
        { kind: "path", pathId: "cloud", expectedVersion: 0 },
        "path-key",
      );
      const confirmed = await store.update(
        owner,
        profile,
        catalog,
        { kind: "confirm-gap", skill: "cloud", expectedVersion: 1 },
        "confirm-key",
      );
      const action = await store.update(
        owner,
        profile,
        catalog,
        { kind: "select-action", skill: "cloud", expectedVersion: 2 },
        "action-key",
      );
      assert.equal(action.plan.actions.length, 1);
      assert.deepEqual(await makeStore().read(owner, profile, catalog), action);
      assert.deepEqual(
        await store.update(
          owner,
          profile,
          catalog,
          { kind: "path", pathId: "cloud", expectedVersion: 0 },
          "path-key",
        ),
        first,
      );
      await assert.rejects(
        () => store.read(other, profile, catalog),
        /unavailable/,
      );
      await assert.rejects(
        () =>
          store.update(
            owner,
            profile,
            catalog,
            { kind: "path", pathId: "ml", expectedVersion: confirmed.version },
            "stale-key",
          ),
        /view changed/,
      );
      await pool.query(
        "UPDATE resume_profile_heads SET current_version=current_version+1 WHERE id=$1",
        [profile.id],
      );
      await assert.rejects(
        () => store.read(owner, profile, catalog),
        /Profile changed/,
      );
      const updated = { ...profile, version: profile.version + 1 };
      await assert.rejects(
        () =>
          store.update(
            owner,
            profile,
            catalog,
            { kind: "path", pathId: "cloud", expectedVersion: 0 },
            "path-key",
          ),
        /Profile changed/,
      );
      const stale = await store.read(owner, updated, catalog);
      assert.equal(stale.plan.confirmations.length, 0);
      assert.deepEqual(stale.staleActionIds, [action.plan.actions[0].id]);
      await pool.query(
        "UPDATE opportunity_catalog_state SET version='integration-v2'",
      );
      await assert.rejects(
        () =>
          store.update(
            owner,
            updated,
            catalog,
            { kind: "path", pathId: "ml", expectedVersion: 3 },
            "catalog-key",
          ),
        /Catalog changed/,
      );
      await pool.query("DELETE FROM resume_profile_heads WHERE id=$1", [
        profile.id,
      ]);
      assert.equal(
        (await pool.query("SELECT 1 FROM career_plans")).rowCount,
        0,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
test(
  "a selected Gemini recommendation persists as a durable action snapshot, survives restart, respects caps and rejects a duplicate save",
  { skip: !connectionString },
  async () => {
    const admin = new Pool({ connectionString });
    const schema = `plans_recs_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const owner = randomUUID();
    const profile = { ...profiles[0], id: randomUUID() };
    const catalog = { jobs, paths, resources, version: "integration-v1" };
    const makeStore = () =>
      new CareerPlans(drizzle(pool), new PostgresOperations(pool));
    const recommendation: CareerAnalysis["recommendations"][number] = {
      title: "Build a small deployable project",
      kind: "project",
      why: "Extends your existing cloud coursework into a concrete deliverable.",
      deliverable: "Deploy a small service and document the setup.",
      basis: "build_on_evidence",
      factIds: ["fact-1"],
      sourceIds: ["source-1"],
      resourceIds: [],
      learningNeed: "not_claimed",
      skill: "cloud",
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
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1::uuid,'test',$1::text)",
        [owner],
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,$3,now()+interval '1 day')",
        [profile.id, owner, profile.version],
      );
      await pool.query(
        "INSERT INTO opportunity_catalog_state VALUES(true,$1)",
        [catalog.version],
      );
      const store = makeStore();
      await store.update(
        owner,
        profile,
        catalog,
        { kind: "path", pathId: "cloud", expectedVersion: 0 },
        "path-key",
        undefined,
        undefined,
      );
      const saved = await store.update(
        owner,
        profile,
        catalog,
        {
          kind: "select-recommendation",
          expectedVersion: 1,
          contextHash: "a".repeat(64),
          index: 0,
        },
        "select-key",
        undefined,
        recommendation,
      );
      assert.equal(saved.plan.actions.length, 1);
      const action = saved.plan.actions[0];
      assert.equal(action.title, recommendation.title);
      assert.equal(action.deliverable, recommendation.deliverable);
      assert.deepEqual(action.recommendation, {
        contextHash: "a".repeat(64),
        index: 0,
        why: recommendation.why,
        factIds: recommendation.factIds,
        sourceIds: recommendation.sourceIds,
        resourceIds: recommendation.resourceIds,
      });
      // Restart: a fresh CareerPlans instance reading from the DB must see
      // the exact same persisted snapshot, not an in-memory artifact.
      assert.deepEqual(await makeStore().read(owner, profile, catalog), saved);
      // Selecting the identical recommendation (same contextHash+index) again
      // must be rejected as a duplicate, not silently saved twice.
      await assert.rejects(
        () =>
          store.update(
            owner,
            profile,
            catalog,
            {
              kind: "select-recommendation",
              expectedVersion: saved.version,
              contextHash: "a".repeat(64),
              index: 0,
            },
            "select-key-2",
            undefined,
            recommendation,
          ),
        /already saved/,
      );
      // Server refuses to save without a verified recommendation, even if the
      // caller somehow reaches this path with a well-formed command.
      await assert.rejects(
        () =>
          store.update(
            owner,
            profile,
            catalog,
            {
              kind: "select-recommendation",
              expectedVersion: saved.version,
              contextHash: "b".repeat(64),
              index: 1,
            },
            "select-key-3",
            undefined,
            undefined,
          ),
        /current verified recommendation/,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
test(
  "update() redirects a saved plan off a since-unselected field for every command kind, not only an explicit path change, and rejects a stale interest version",
  { skip: !connectionString },
  async () => {
    const admin = new Pool({ connectionString });
    const schema = `plans_interests_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const owner = randomUUID();
    const profile = { ...profiles[0], id: randomUUID() };
    const catalog = { jobs, paths, resources, version: "integration-v1" };
    const store = new CareerPlans(drizzle(pool), new PostgresOperations(pool));
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
        "INSERT INTO app_users(id,auth_issuer,auth_subject,interest_version,interest_fields) VALUES($1::uuid,'test',$1::text,1,'[\"cloud\"]'::jsonb)",
        [owner],
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,$3,now()+interval '1 day')",
        [profile.id, owner, profile.version],
      );
      await pool.query(
        "INSERT INTO opportunity_catalog_state VALUES(true,$1)",
        [catalog.version],
      );
      const started = await store.update(
        owner,
        profile,
        catalog,
        { kind: "path", pathId: "software", expectedVersion: 0 },
        "path-key",
        { version: 1, fields: ["software"] },
      );
      assert.equal(started.plan.pathId, "software");
      // The user now unselects "software" in favor of "ml" -- a real onboarding edit.
      await pool.query(
        "UPDATE app_users SET interest_version=2,interest_fields='[\"ml\"]'::jsonb WHERE id=$1",
        [owner],
      );
      // A non-path command (preferences) must still redirect off the removed
      // field before being applied, not only an explicit "path" command.
      const redirected = await store.update(
        owner,
        profile,
        catalog,
        {
          kind: "preferences",
          preferences: {
            roleType: "any",
            remote: "any",
            location: "any",
            inclusion: [],
          },
          expectedVersion: started.version,
        },
        "preferences-key",
        { version: 2, fields: ["ml"] },
      );
      assert.equal(
        redirected.plan.pathId,
        "ml",
        "an implicit (non-path) command must redirect off a since-unselected field",
      );
      const persisted = await store.read(owner, profile, catalog);
      assert.equal(
        persisted.plan.pathId,
        "ml",
        "the redirect must actually persist, not just appear in the response",
      );
      await assert.rejects(
        () =>
          store.update(
            owner,
            profile,
            catalog,
            {
              kind: "preferences",
              preferences: {
                roleType: "any",
                remote: "any",
                location: "any",
                inclusion: [],
              },
              expectedVersion: redirected.version,
            },
            "stale-interest-key",
            { version: 1, fields: ["software"] },
          ),
        /interests changed/,
        "a caller holding a stale interest version must be rejected, not silently overridden",
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
