import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 004 T009 — Create `service_client` catalogue table per data-model.md §2.
 *
 * The catalogue row. **Append-only with respect to `client_id`** (FR-004) —
 * no DELETE is ever issued by 004 code; status transitions are the only
 * mutation pattern. Secret material is held by Hydra (no secret column).
 *
 * Constraints (two-layer with DTO validators):
 *   - `client_id` regex `^[a-z][a-z0-9-]{2,62}$` AND no `--` AND no
 *     trailing `-` (FR-001; ASCII-safe URL-safe slug shape)
 *   - `audience = client_id` (Assumptions §Audience binding)
 *   - `access_token_lifetime_seconds BETWEEN 300 AND 900` (FR-001 / FR-012)
 *   - `token_endpoint_auth_method IN ('client_secret_basic','client_secret_post')` (FR-008)
 *   - `status IN ('enabled','disabled')` (FR-004; no third status in v1)
 *
 * `name_normalised` is a Postgres generated column (lower+trim) used as
 * the uniqueness key per Clarifications Session 2026-05-18. The original
 * `name` retains the admin-supplied casing for display.
 *
 * FK posture:
 *   - `owner_user_id → "user"(id) ON DELETE RESTRICT` — User-deletion runs
 *     cascade-revoke BEFORE attempting the User delete; RESTRICT is the
 *     safety net catching any path that bypasses the cascade flow.
 *   - `created_by_user_id → "user"(id)` — informational, no cascade behaviour.
 *
 * Indexes:
 *   - PK on `client_id`
 *   - UNIQUE on `name_normalised`
 *   - (status, created_at DESC) for the FR-002 default `enabled`-only
 *     listing with cursor pagination
 *   - (owner_user_id) for the FR-004 cascade-revoke lookup at
 *     User-deletion time
 */
export class CreateServiceClient1779148800001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_client" (
        "client_id" varchar(63) NOT NULL,
        "name" varchar(255) NOT NULL,
        "name_normalised" varchar(255) GENERATED ALWAYS AS (lower(trim("name"))) STORED,
        "owner_user_id" uuid NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "audience" varchar(63) NOT NULL,
        "access_token_lifetime_seconds" integer NOT NULL,
        "token_endpoint_auth_method" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "created_by_user_id" uuid NOT NULL,
        "last_rotated_at" timestamptz NULL,
        "last_status_changed_at" timestamptz NULL,
        CONSTRAINT "PK_service_client_client_id" PRIMARY KEY ("client_id"),
        CONSTRAINT "UQ_service_client_name_normalised" UNIQUE ("name_normalised"),
        CONSTRAINT "CHK_service_client_client_id_shape"
          CHECK (
            "client_id" ~ '^[a-z][a-z0-9-]{2,62}$'
            AND "client_id" NOT LIKE '%--%'
            AND "client_id" NOT LIKE '%-'
          ),
        CONSTRAINT "CHK_service_client_audience_eq_client_id"
          CHECK ("audience" = "client_id"),
        CONSTRAINT "CHK_service_client_atl_bounds"
          CHECK ("access_token_lifetime_seconds" BETWEEN 300 AND 900),
        CONSTRAINT "CHK_service_client_token_endpoint_auth_method"
          CHECK ("token_endpoint_auth_method" IN ('client_secret_basic','client_secret_post')),
        CONSTRAINT "CHK_service_client_status"
          CHECK ("status" IN ('enabled','disabled')),
        CONSTRAINT "FK_service_client_owner_user_id"
          FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_service_client_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_service_client_status_created_at"
        ON "service_client" ("status", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_service_client_owner_user_id"
        ON "service_client" ("owner_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_service_client_owner_user_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_service_client_status_created_at"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_client"`);
  }
}
