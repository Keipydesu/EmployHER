ALTER TABLE profile_owner_lifecycle ADD CONSTRAINT profile_lifecycle_owner_fk FOREIGN KEY(owner_id) REFERENCES app_users(id);
ALTER TABLE resume_profile_heads ADD CONSTRAINT profile_head_owner_fk FOREIGN KEY(owner_id) REFERENCES app_users(id);
ALTER TABLE resume_profile_heads ADD CONSTRAINT profile_id_owner_unique UNIQUE(id, owner_id);
ALTER TABLE profile_invalidation_events ADD CONSTRAINT profile_event_owner_fk FOREIGN KEY(profile_id,owner_id) REFERENCES resume_profile_heads(id,owner_id) ON DELETE CASCADE;
