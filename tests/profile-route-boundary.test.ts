import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDemoSession,
  getProfileRuntime,
  getDemoProfileRuntime,
} from "../src/profile/runtime.ts";
import { createProfileHandlers } from "../src/profile/http.ts";
import { resumeFixtures } from "../src/profile/fixtures.ts";
test("anonymous sample cookie never authorizes the private runtime", async () => {
  const old = process.env.PROFILE_DEMO_MODE;
  process.env.PROFILE_DEMO_MODE = "true";
  try {
    const token = createDemoSession();
    const req = () =>
      new Request("http://localhost/api/resumes", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
          "idempotency-key": "boundary-key",
          cookie: `profile_demo=${token}`,
        },
        body: JSON.stringify({ text: resumeFixtures[0].text }),
      });
    const privateResult =
      await createProfileHandlers(getProfileRuntime).post(req());
    assert.equal(privateResult.status, 503);
    const demoResult = await createProfileHandlers(getDemoProfileRuntime).post(
      req(),
    );
    assert.equal(demoResult.status, 201);
  } finally {
    if (old === undefined) delete process.env.PROFILE_DEMO_MODE;
    else process.env.PROFILE_DEMO_MODE = old;
  }
});
