#!/bin/sh
# Build first: docker build --target runner -t employher-local .
set -eu
image=${1:-employher-local}
container="employher-smoke-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM
docker run -d --name "$container" "$image" >/dev/null
docker exec -i "$container" node --input-type=module <<'JS'
const base = "http://127.0.0.1:3000";
let response;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    response = await fetch(base, { signal: AbortSignal.timeout(2000) });
    if (response.ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!response?.ok) throw new Error("Production server did not become ready");
const html = await response.text();
if (!html.includes("Your possibilities.")) throw new Error("Production homepage content missing");
const assets = [...new Set(html.match(/\/_next\/static\/[^"\s<>]+\.(?:js|css)/g))];
if (!assets.length) throw new Error("No production static assets found");
for (const asset of assets) {
  const result = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(5000) });
  if (!result.ok || !(await result.text()).length) throw new Error(`Static asset failed: ${asset}`);
}
console.log(`Production HTML and ${assets.length} static assets: OK`);
JS
