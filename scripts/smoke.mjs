const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const response = await fetch(base, { signal: AbortSignal.timeout(5000) });
if (!response.ok) throw new Error(`Homepage returned ${response.status}`);
const html = await response.text();
if (!html.includes("Your possibilities.")) {
  throw new Error("Homepage content missing");
}
const assets = [
  ...new Set(html.match(/\/_next\/static\/[^"\s<>]+\.(?:js|css)/g)),
];
if (!assets.length) throw new Error("No static assets found");
for (const asset of assets) {
  const result = await fetch(new URL(asset, base), {
    signal: AbortSignal.timeout(5000),
  });
  if (!result.ok || !(await result.text()).length) {
    throw new Error(`Static asset failed: ${asset}`);
  }
}
console.log(`Homepage and ${assets.length} static assets: OK`);
