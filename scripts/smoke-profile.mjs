import assert from "node:assert/strict";
const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const request = (path, options) =>
  fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(5000) });
const page = await request("/profile");
assert.equal(page.status, 200);
const html = await page.text();
assert(
  html.includes("Integration required"),
  "production must not enable synthetic profile sessions",
);
const assets = [
  ...new Set(html.match(/\/_next\/static\/[^"\s<>]+\.(?:js|css)/g)),
];
assert(assets.length > 0);
for (const asset of assets) {
  const response = await request(asset);
  assert.equal(response.status, 200);
  assert((await response.text()).length > 0);
}
const session = await request("/api/demo/session", {
  method: "POST",
  headers: { origin: new URL(base).origin },
});
assert.equal(session.status, 503);
assert.equal((await session.json()).error.code, "PLATFORM_NOT_CONFIGURED");
const profile = await request(
  "/api/resumes/00000000-0000-4000-8000-000000000001",
);
assert.equal(profile.status, 503);
assert.equal((await profile.json()).error.code, "PLATFORM_NOT_CONFIGURED");
console.log(
  `Profile page, ${assets.length} assets, and production API gates: OK`,
);
