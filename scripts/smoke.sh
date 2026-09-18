#!/bin/sh
# Run after docker compose up --build --wait. Uses no personal data.
set -eu

docker compose exec -T app node -e '
fetch("http://127.0.0.1:3000", { signal: AbortSignal.timeout(5000) })
  .then(async (response) => {
    if (!response.ok || !(await response.text()).includes("Your possibilities.")) {
      throw new Error("Homepage check failed");
    }
    console.log("Homepage: OK");
  })
  .catch((error) => { console.error(error.message); process.exit(1); });
'
result=$(docker compose exec -T db sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -h db -U employher -d employher -v ON_ERROR_STOP=1 -tA' <<'SQL'
SELECT '[1,0,0]'::vector <=> '[1,0,0]'::vector;
SQL
)
[ "$result" = "0" ] || { echo 'Vector query failed' >&2; exit 1; }
echo 'PostgreSQL TCP authentication and pgvector cosine distance: OK'
