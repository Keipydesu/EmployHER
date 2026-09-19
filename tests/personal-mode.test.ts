import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  personalResumeEnabled,
  requirePersonalConsent,
  PERSONAL_CONSENT_VERSION,
} from "../src/profile/personal-mode";
import { ProfileError } from "../src/profile/errors";
import {
  installProfileRuntime,
  getProfileRuntime,
  getDemoProfileRuntime,
  createDemoSession,
  type ProfileRuntime,
} from "../src/profile/runtime";
import { createProfileHandlers } from "../src/profile/http";
import { resumeFixtures } from "../src/profile/fixtures";

const withEnv = async (
  values: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
) => {
  const names = Object.keys(values);
  const previous = names.map((name) => [name, process.env[name]] as const);
  try {
    for (const name of names) {
      if (values[name] === undefined) delete process.env[name];
      else process.env[name] = values[name];
    }
    await fn();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
};

test("personalResumeEnabled requires the explicit flag, a loopback base URL, and never fires on Vercel", async () => {
  await withEnv(
    {
      PERSONAL_RESUME_ENABLED: undefined,
      APP_BASE_URL: "http://localhost:3000",
      VERCEL: undefined,
    },
    () => assert.equal(personalResumeEnabled(), false, "flag off"),
  );
  await withEnv(
    {
      PERSONAL_RESUME_ENABLED: "true",
      APP_BASE_URL: "https://example.com",
      VERCEL: undefined,
    },
    () => assert.equal(personalResumeEnabled(), false, "non-loopback host"),
  );
  await withEnv(
    {
      PERSONAL_RESUME_ENABLED: "true",
      APP_BASE_URL: "not a url",
      VERCEL: undefined,
    },
    () => assert.equal(personalResumeEnabled(), false, "malformed base URL"),
  );
  await withEnv(
    {
      PERSONAL_RESUME_ENABLED: "true",
      APP_BASE_URL: "http://localhost:3000",
      VERCEL: "1",
    },
    () =>
      assert.equal(
        personalResumeEnabled(),
        false,
        "a hosted Vercel deployment must never enable this regardless of other settings",
      ),
  );
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    await withEnv(
      {
        PERSONAL_RESUME_ENABLED: "true",
        APP_BASE_URL: `http://${host}:3000`,
        VERCEL: undefined,
      },
      () => assert.equal(personalResumeEnabled(), true, `${host} is loopback`),
    );
  }
});

test("requirePersonalConsent only accepts the current versioned header", () => {
  const withHeader = (value: string | null) =>
    new Request("http://localhost/api/resumes", {
      method: "POST",
      headers: value ? { "x-resume-consent": value } : {},
    });
  assert.throws(
    () => requirePersonalConsent(undefined),
    (error: unknown) =>
      error instanceof ProfileError && error.code === "CONSENT_REQUIRED",
  );
  assert.throws(
    () => requirePersonalConsent(withHeader(null)),
    (error: unknown) =>
      error instanceof ProfileError && error.code === "CONSENT_REQUIRED",
  );
  assert.throws(
    () => requirePersonalConsent(withHeader("stale-version")),
    (error: unknown) =>
      error instanceof ProfileError && error.code === "CONSENT_REQUIRED",
  );
  assert.doesNotThrow(() =>
    requirePersonalConsent(withHeader(PERSONAL_CONSENT_VERSION)),
  );
});

// Mirrors the authorizeIntake wiring in src/server/platform/bootstrap.ts
// without a live database, so the HTTP boundary contract stays covered
// independently of the platform's DB/Auth0 dependencies.
function installFakeAuthenticatedRuntime(intake: (text: string) => void) {
  const service = {
    intake: async (_owner: string, _key: string, text: string) => {
      intake(text);
      return {
        id: randomUUID(),
        version: 1,
        status: "draft",
        facts: [],
        embedding: null,
      };
    },
  } as unknown as ProfileRuntime["service"];
  const runtime: ProfileRuntime = {
    service,
    authorize: async () => randomUUID(),
    authorizeIntake: async (_owner, text, request) => {
      if (personalResumeEnabled()) {
        requirePersonalConsent(request);
        return;
      }
      if (!resumeFixtures.some((f) => f.text === text))
        throw new ProfileError(
          "FIXTURE_ONLY",
          403,
          "Use a supplied synthetic résumé.",
        );
    },
  };
  installProfileRuntime(runtime);
}

test("HTTP intake: personal mode gates arbitrary uploads on consent and never calls the provider without it", async () => {
  const calls: string[] = [];
  const arbitraryText =
    "Arbitrary real résumé text a fixture-only boundary would reject.";
  const request = (headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/resumes", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
        "idempotency-key": "personal-mode-key-1",
        ...headers,
      },
      body: JSON.stringify({ text: arbitraryText }),
    });
  await withEnv(
    {
      PERSONAL_RESUME_ENABLED: undefined,
      APP_BASE_URL: "http://localhost",
      VERCEL: undefined,
    },
    async () => {
      installFakeAuthenticatedRuntime((text) => calls.push(text));
      const disabled =
        await createProfileHandlers(getProfileRuntime).post(request());
      assert.equal(disabled.status, 403, "disabled mode still fixture-gates");
      assert.equal(calls.length, 0);
    },
  );
  await withEnv(
    {
      PERSONAL_RESUME_ENABLED: "true",
      APP_BASE_URL: "http://localhost",
      VERCEL: undefined,
    },
    async () => {
      installFakeAuthenticatedRuntime((text) => calls.push(text));
      const noConsent =
        await createProfileHandlers(getProfileRuntime).post(request());
      assert.equal(noConsent.status, 400);
      assert.equal((await noConsent.json()).error.code, "CONSENT_REQUIRED");
      assert.equal(
        calls.length,
        0,
        "the provider/service must never be reached without consent",
      );
      const withConsent = await createProfileHandlers(getProfileRuntime).post(
        request({
          "x-resume-consent": PERSONAL_CONSENT_VERSION,
          "idempotency-key": "personal-mode-key-2",
        }),
      );
      assert.equal(withConsent.status, 201);
      assert.deepEqual(
        calls,
        [arbitraryText],
        "consented personal mode accepts arbitrary, non-fixture text",
      );
    },
  );
});

test("anonymous sample route stays fixture-only even while personal mode is enabled for authenticated intake", async () => {
  await withEnv(
    {
      PERSONAL_RESUME_ENABLED: "true",
      APP_BASE_URL: "http://localhost",
      VERCEL: undefined,
      PROFILE_DEMO_MODE: "true",
    },
    async () => {
      const token = createDemoSession();
      const request = (text: string) =>
        new Request("http://localhost/api/demo/resumes", {
          method: "POST",
          headers: {
            origin: "http://localhost",
            "content-type": "application/json",
            "idempotency-key": randomUUID(),
            cookie: `profile_demo=${token}`,
            "x-resume-consent": PERSONAL_CONSENT_VERSION,
          },
          body: JSON.stringify({ text }),
        });
      const arbitrary = await createProfileHandlers(getDemoProfileRuntime).post(
        request("Arbitrary text a fixture-only anonymous demo must reject."),
      );
      assert.equal(arbitrary.status, 403);
      assert.equal((await arbitrary.json()).error.code, "FIXTURE_ONLY");
      const fixture = await createProfileHandlers(getDemoProfileRuntime).post(
        request(resumeFixtures[0].text),
      );
      assert.equal(fixture.status, 201);
    },
  );
});
