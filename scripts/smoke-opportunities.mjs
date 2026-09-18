// Tracked HTTP smoke test for the synthetic /api/demo/opportunities slice.
// Exercises the same-origin gate on BOTH accepted loopback hostnames
// (127.0.0.1 and localhost), the demo cookie session lifecycle, command
// validation, and the idempotency replay contract, against a running
// `next start`/`next dev` server. It never touches app/src; failures throw
// and exit non-zero.

const port = process.env.SMOKE_OPPORTUNITIES_PORT ?? "3000";
const hosts = (process.env.SMOKE_OPPORTUNITIES_HOSTS ?? "127.0.0.1,localhost")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

function extractCookie(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return null;
  const match = raw.match(/employher-demo=([a-f0-9]{64})/);
  return match ? match[0] : null;
}

async function request(base, path, init = {}) {
  return fetch(new URL(path, base), {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
}

async function requireStatus(response, expected, label) {
  if (response.status !== expected) {
    const body = await response.text().catch(() => "<unreadable>");
    throw new Error(
      `${label}: expected ${expected}, got ${response.status}. Body: ${body}`,
    );
  }
}

async function checkHost(host) {
  const base = `http://${host}:${port}`;
  const otherHost = host === "localhost" ? "127.0.0.1" : "localhost";
  const slug = host.replace(/[^a-zA-Z0-9]/g, "");

  const ownedCookies = new Set();
  try {
    // 1. GET creates a fresh session and sets the cookie.
    const created = await request(base, "/api/demo/opportunities");
    await requireStatus(created, 200, `${host}: GET creates session`);
    const cookie = extractCookie(created);
    if (!cookie) throw new Error(`${host}: GET did not set the demo cookie`);
    ownedCookies.add(cookie);
    const initial = await created.json();
    if (initial.mode !== "synthetic-demo")
      throw new Error(`${host}: unexpected demo mode ${initial.mode}`);

    // 2. A same-origin, well-formed POST succeeds.
    const keyA = `smoke-${slug}-a-${Date.now()}`;
    const postA = await request(base, "/api/demo/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        Cookie: cookie,
        "Idempotency-Key": keyA,
      },
      body: JSON.stringify({
        kind: "profile",
        expectedVersion: initial.version,
        profileId: "cloud",
      }),
    });
    await requireStatus(postA, 200, `${host}: same-origin POST`);
    const afterA = await postA.json();
    if (afterA.profile.id !== "cloud")
      throw new Error(`${host}: profile switch did not apply`);

    // 3. A second, different command moves the session further forward.
    const postB = await request(base, "/api/demo/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        Cookie: cookie,
        "Idempotency-Key": `smoke-${slug}-b-${Date.now()}`,
      },
      body: JSON.stringify({
        kind: "preferences",
        expectedVersion: afterA.version,
        preferences: {
          roleType: "internship",
          remote: "any",
          location: "any",
          inclusion: [],
        },
      }),
    });
    await requireStatus(postB, 200, `${host}: follow-up POST`);
    const afterB = await postB.json();
    if (afterB.version === afterA.version)
      throw new Error(`${host}: follow-up command did not advance version`);

    // 4. Replaying the FIRST key must return exactly what it originally
    // produced, not the session's current (later) state.
    const replay = await request(base, "/api/demo/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        Cookie: cookie,
        "Idempotency-Key": keyA,
      },
      body: JSON.stringify({
        kind: "profile",
        expectedVersion: initial.version,
        profileId: "cloud",
      }),
    });
    await requireStatus(replay, 200, `${host}: idempotency replay`);
    const replayed = await replay.json();
    if (!replayed.replayed) throw new Error(`${host}: replay flag missing`);
    if (replayed.version !== afterA.version)
      throw new Error(
        `${host}: idempotency replay leaked later state (got version ${replayed.version}, expected ${afterA.version})`,
      );
    if (
      JSON.stringify(replayed.preferences) !==
      JSON.stringify(afterA.preferences)
    )
      throw new Error(
        `${host}: idempotency replay leaked a later command's effect`,
      );

    // 5. A cross-host Origin is rejected even though both hosts are loopback.
    const crossOrigin = await request(base, "/api/demo/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: `http://${otherHost}:${port}`,
        Cookie: cookie,
        "Idempotency-Key": `smoke-${slug}-cross-${Date.now()}`,
      },
      body: JSON.stringify({ kind: "reset", expectedVersion: afterB.version }),
    });
    await requireStatus(
      crossOrigin,
      403,
      `${host}: cross-host Origin rejected`,
    );

    // 6. A fully hostile Origin is rejected.
    const hostile = await request(base, "/api/demo/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
        Cookie: cookie,
        "Idempotency-Key": `smoke-${slug}-evil-${Date.now()}`,
      },
      body: JSON.stringify({ kind: "reset", expectedVersion: afterB.version }),
    });
    await requireStatus(hostile, 403, `${host}: hostile Origin rejected`);

    // 7. A stale expectedVersion is a 409, not a silent success.
    const stale = await request(base, "/api/demo/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        Cookie: cookie,
        "Idempotency-Key": `smoke-${slug}-stale-${Date.now()}`,
      },
      body: JSON.stringify({ kind: "reset", expectedVersion: 1 }),
    });
    await requireStatus(stale, 409, `${host}: stale version rejected`);

    // 8. A second, cookie-less session is isolated from the first.
    const secondSession = await request(base, "/api/demo/opportunities");
    await requireStatus(secondSession, 200, `${host}: second session`);
    const secondCookie = extractCookie(secondSession);
    if (!secondCookie) throw new Error("Second session cookie missing");
    ownedCookies.add(secondCookie);
    if (secondCookie === cookie)
      throw new Error(
        `${host}: second session reused the first session's token`,
      );
    const secondBody = await secondSession.json();
    if (secondBody.profile.id === "cloud")
      throw new Error(
        `${host}: second session leaked the first session's state`,
      );

    // 9. DELETE clears the session; a subsequent GET starts fresh.
    const del = await request(base, "/api/demo/opportunities", {
      method: "DELETE",
      headers: { Origin: base, Cookie: cookie },
    });
    await requireStatus(del, 200, `${host}: DELETE`);
    const afterDelete = await request(base, "/api/demo/opportunities", {
      headers: { Cookie: cookie },
    });
    await requireStatus(
      afterDelete,
      200,
      `${host}: fresh session after delete`,
    );
    const freshCookie = extractCookie(afterDelete);
    if (!freshCookie) throw new Error("Replacement session cookie missing");
    ownedCookies.add(freshCookie);
    const freshAfterDelete = await afterDelete.json();
    if (freshAfterDelete.version !== 1)
      throw new Error(`${host}: session was not actually cleared`);

    console.log(`${host}: opportunities demo API smoke OK (9 checks)`);
  } finally {
    // Remove only sessions this run created, even when an assertion fails.
    for (const cookie of ownedCookies) {
      const result = await request(base, "/api/demo/opportunities", {
        method: "DELETE",
        headers: { Origin: base, Cookie: cookie },
      });
      await requireStatus(result, 200, `${host}: smoke session cleanup`);
    }
  }
}

for (const host of hosts) {
  await checkHost(host);
}
