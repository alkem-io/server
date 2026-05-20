import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 004 T010 — Create `service_client_scope` join table per data-model.md §3.
 *
 * Composite PK `(client_id, scope_name)`. Mutation patterns:
 *   - Replace-on-update for FR-002a `updateServiceClientScopes` (full
 *     replacement semantics — diff added/removed before write, emitted on
 *     the FR-020 audit event from the application layer).
 *   - Cascade-narrow on FR-007a `removePlatformScope` — the FK on
 *     `scope_name` cascades; the application layer does a
 *     `SELECT client_id ... WHERE scope_name = $1` BEFORE the delete to
 *     emit per-holder audit events.
 *
 * FK posture:
 *   - `client_id → service_client(client_id) ON DELETE RESTRICT` — the
 *     catalogue is append-only with respect to `client_id`, so no
 *     cascade-delete is ever desired.
 *   - `scope_name → platform_scope(name) ON DELETE CASCADE` — supports
 *     the FR-007a cascade-narrow behaviour (the application layer
 *     emits per-affected-client audit events before issuing the
 *     `removePlatformScope` delete).
 *
 * Indexes:
 *   - PK (client_id, scope_name)
 *   - (scope_name) for the cascade-narrow lookup
 */
export class CreateServiceClientScope1779148800002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_client_scope" (
        "client_id" varchar(63) NOT NULL,
        "scope_name" varchar(63) NOT NULL,
        "granted_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_client_scope" PRIMARY KEY ("client_id","scope_name"),
        CONSTRAINT "FK_service_client_scope_client_id"
          FOREIGN KEY ("client_id") REFERENCES "service_client"("client_id") ON DELETE RESTRICT,
        CONSTRAINT "FK_service_client_scope_scope_name"
          FOREIGN KEY ("scope_name") REFERENCES "platform_scope"("name") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_service_client_scope_scope_name"
        ON "service_client_scope" ("scope_name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_service_client_scope_scope_name"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_client_scope"`);
  }
}
