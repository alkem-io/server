import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 006-collab-content-unification — create the server-owned `collaboration_lifecycle_outbox`
 * table: the transactional outbox that makes the owner-driven `document.deleted`
 * (FR-006/FR-023) durable across a crash between the leaf Memo/Whiteboard removal and the
 * broker publish. Written by the server in the same transaction as the removal and drained
 * by `CollaborationLifecycleDispatcherService` (see those for the drain semantics).
 *
 * The drain derives the constant `document.deleted { id }` payload and orders by the `id`
 * primary key, and multi-pod safety is the row lock + `SKIP LOCKED` alone — so the row
 * needs only `id`, `documentId`, `createdDate`, with no status/lease/attempts state and
 * therefore no CHECK constraints or partial indexes. Columns are camelCase to match the
 * TypeORM entity (server DefaultNamingStrategy); contrast the Go-owned `file_backup_outbox`,
 * which the server never reads/writes.
 */
export class CollaborationLifecycleOutbox1785810000000
  implements MigrationInterface
{
  name = 'CollaborationLifecycleOutbox1785810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "collaboration_lifecycle_outbox" (
        "id"          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "documentId"  uuid                     NOT NULL,
        "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "collaboration_lifecycle_outbox"`
    );
  }
}
