# 005. TypeScript and Tailwind CSS; exclude Drizzle

- Status: Superseded by [decision 006](006-retain-drizzle-with-tiger-data.md) after the operator clarified the database layer. The removal plan below is historical and must not drive implementation.
- Date: 2026-09-19.
- Supersedes: the Drizzle selection in decision 002. Other stack choices remain unchanged.

## Decision

Use TypeScript and Tailwind CSS for the application frontend. Drizzle is not part of the intended stack. Tailwind provides styling and TypeScript provides language/type checking; neither replaces database access or migrations. Keep Tiger Data PostgreSQL/pgvector and Zod. Choose database-access and migration tooling during R0 rather than silently selecting another ORM.

## Implementation impact

TypeScript is already implemented. Current screens use plain CSS; Tailwind integration remains planned. Existing profile schema/repository code and installed dependencies still use Drizzle. This documentation decision does not remove them or claim the adapters already use another approach.

Inventory and preserve SQL constraints, owner isolation, transactions, immutable profile versions, vector compatibility, invalidation and deletion/expiry behavior when migrating the adapters. Remove the dependency only after imports and tests are migrated and verified. Record the selected database approach separately before integration.

See the [stack](../../TECH-STACK.md), [development guide](../development.md) and single [roadmap](../../roadmap.md).
