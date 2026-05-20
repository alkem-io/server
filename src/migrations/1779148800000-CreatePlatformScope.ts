import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 004 T008 — Create `platform_scope` catalogue table per data-model.md §4.
 *
 * Curated catalogue of OAuth2 scopes that service-clients can hold. Seven
 * R-1 seed rows are inserted idempotently (`ON CONFLICT (name) DO NOTHING`)
 * so re-running this migration in lower environments is safe; the three
 * `read_only_baseline = true` rows are the FR-005 baseline set granted on
 * `registerServiceClient` when the admin omits a scope set.
 *
 * Constraints enforced at the DB layer (safety-net for any code path that
 * bypasses the DTO validators):
 *   - `name` matches `^<resource>:<verb>$` (lowercase, dash/underscore-safe)
 *   - `description` is non-empty (required at create-time, no default fill)
 *
 * Indexes:
 *   - PK on `name`
 *   - Partial index `WHERE read_only_baseline = true` for fast lookup of
 *     the FR-005 baseline set on registration.
 *
 * FK `created_by_user_id → "user"(id)` retains the acting admin (or a
 * designated seed user for the initial rows; here we use the first
 * available `"user".id` so the FK never points into thin air on a fresh
 * deploy — falls back to NULL-blocked-by-NOT-NULL handling if no user
 * row exists yet, which is the same constraint the application surface
 * gives at runtime).
 */
export class CreatePlatformScope1779148800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "platform_scope" (
        "name" varchar(63) NOT NULL,
        "description" text NOT NULL,
        "read_only_baseline" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "created_by_user_id" uuid NOT NULL,
        CONSTRAINT "PK_platform_scope_name" PRIMARY KEY ("name"),
        CONSTRAINT "CHK_platform_scope_name_shape"
          CHECK ("name" ~ '^[a-z][a-z0-9_-]+:[a-z][a-z0-9_-]+$'),
        CONSTRAINT "CHK_platform_scope_description_nonempty"
          CHECK (length("description") > 0),
        CONSTRAINT "FK_platform_scope_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_platform_scope_read_only_baseline"
        ON "platform_scope" ("read_only_baseline")
        WHERE "read_only_baseline" = true
    `);

    // R-1 seed: seven catalogue rows; baseline=true on platform:read,
    // analytics:read, health:read. `created_by_user_id` is set to the
    // first existing user row (deterministic per environment); if no
    // user exists yet the seed is skipped — the platform bootstrap
    // path creates the seed admin first, so on a real deploy this
    // resolves before any production traffic.
    await queryRunner.query(`
      DO $$
      DECLARE
        seed_user_id uuid;
      BEGIN
        SELECT id INTO seed_user_id FROM "user" ORDER BY "createdDate" ASC LIMIT 1;
        IF seed_user_id IS NULL THEN
          RAISE NOTICE
            'platform_scope seed skipped: no "user" rows present yet. '
            'Re-run after bootstrap or seed catalogue rows via addPlatformScope.';
          RETURN;
        END IF;

        INSERT INTO "platform_scope" ("name", "description", "read_only_baseline", "created_by_user_id")
        VALUES
          ('platform:read',
           'Read platform-wide entities (spaces, organisations, users, public profile data) the caller is already authorised to see under the existing platform authorization framework.',
           true, seed_user_id),
          ('analytics:read',
           'Read aggregate analytics resources (counts, dashboards, ecosystem-analytics outputs).',
           true, seed_user_id),
          ('health:read',
           'Read non-authenticated health and version information for ops scripts.',
           true, seed_user_id),
          ('platform:write',
           'Create / update / delete platform-wide entities the caller is already authorised to mutate.',
           false, seed_user_id),
          ('analytics:write',
           'Submit ingestion events to the analytics pipeline (event-emit only; reads use analytics:read).',
           false, seed_user_id),
          ('notifications:write',
           'Trigger out-of-band notifications (email, in-app) on behalf of automation.',
           false, seed_user_id),
          ('space:admin',
           'Administer space lifecycle (create, archive, transfer) — broadest write scope, must be opted-in explicitly.',
           false, seed_user_id)
        ON CONFLICT ("name") DO NOTHING;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_platform_scope_read_only_baseline"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_scope"`);
  }
}
