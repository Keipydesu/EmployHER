import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  jsonb,
  vector,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Fact } from "./contracts";
// C adds the owner FK to its authoritative users table when integrating migrations.
export const profileHeads = pgTable(
  "resume_profile_heads",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    currentVersion: integer("current_version").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("profile_owner_idx").on(table.ownerId),
    check("profile_head_positive_version", sql`${table.currentVersion} > 0`),
  ],
);
export const profileVersions = pgTable(
  "resume_profile_versions",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profileHeads.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status", { enum: ["draft", "confirmed"] }).notNull(),
    facts: jsonb("facts").$type<Fact[]>().notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
    embeddingModel: text("embedding_model"),
    extractionModel: text("extraction_model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.version] }),
    check("profile_positive_version", sql`${table.version} > 0`),
    check(
      "profile_valid_status",
      sql`${table.status} IN ('draft', 'confirmed')`,
    ),
    check("profile_facts_array", sql`jsonb_typeof(${table.facts}) = 'array'`),
    check(
      "profile_confirmation_embedding",
      sql`(
      ${table.status} = 'draft' AND ${table.embedding} IS NULL AND ${table.embeddingModel} IS NULL
    ) OR (
      ${table.status} = 'confirmed' AND ${table.embedding} IS NOT NULL AND ${table.embeddingModel} IS NOT NULL
    )`,
    ),
  ],
);
export const profileEvents = pgTable("profile_invalidation_events", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profileHeads.id, { onDelete: "cascade" }),
  previousVersion: integer("previous_version").notNull(),
  version: integer("version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
// Serialize deletion against create/update, without depending on C's users schema.
export const profileOwnerLifecycle = pgTable("profile_owner_lifecycle", {
  ownerId: uuid("owner_id").primaryKey(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
