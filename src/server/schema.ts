import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Platform users table (Person C). Auth0 `sub` is the external identity;
// `id` is the internal UUID every other domain table references.
export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  auth0Sub: text("auth0_sub").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Durable backing for the profile `Operations` port (idempotency/replay).
// Person A's in-memory `MemoryOperations` is test-only; this is Person C's
// durable equivalent for real intake/update requests.
export const profileOperations = pgTable(
  "profile_operations",
  {
    ownerId: uuid("owner_id").notNull(),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    digest: text("digest").notNull(),
    pending: boolean("pending").notNull().default(true),
    leaseExpiresAt: timestamp("lease_expires_at", {
      withTimezone: true,
    }).notNull(),
    value: jsonb("value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.kind, table.key] })],
);
