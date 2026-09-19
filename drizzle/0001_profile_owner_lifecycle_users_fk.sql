-- Person C integration: bind Person A's owner lifecycle table to the
-- platform users table. Not modeled in src/profile/schema.ts so that file
-- stays A's untouched contract; enforced here at the database level only.
ALTER TABLE "profile_owner_lifecycle"
  ADD CONSTRAINT "profile_owner_lifecycle_owner_id_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");
