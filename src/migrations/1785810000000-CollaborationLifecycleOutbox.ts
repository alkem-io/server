import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 006-collab-content-unification — create the server-owned
 * `collaboration_lifecycle_outbox` table: the transactional outbox that makes
 * the owner-driven `document.deleted` (FR-006/FR-023) durable across a crash
 * between the leaf Memo/Whiteboard removal and the broker publish.
 *
 * Unlike `file_backup_outbox` (Go-owned; server never reads/writes it), THIS
 * outbox is written by the server in the same transaction as the leaf removal
 * (`CollaborationLifecycleService.enqueueDocumentDeleted`) and claimed by the
 * server dispatcher (`CollaborationLifecycleDispatcherService`) with
 * `FOR UPDATE SKIP LOCKED`. Columns are camelCase to match the TypeORM entity
 * (server DefaultNamingStrategy).
 *
 * `claimVersion` is the per-row claim token that fences a lapsed worker out of
 * the current owner's terminal write; `deliveredAt` (not `createdDate`) drives
 * retention. CHECK constraints pin `status` and `eventType`. `document.deleted`
 * is the only event this outbox carries.
 */
export class CollaborationLifecycleOutbox1785810000000
  implements MigrationInterface
{
  name = 'CollaborationLifecycleOutbox1785810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "collaboration_lifecycle_outbox" (
        "id"           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "documentId"   uuid                     NOT NULL,
        "eventType"    character varying(32)    NOT NULL,
        "status"       character varying(16)    NOT NULL DEFAULT 'pending',
        "attempts"     integer                  NOT NULL DEFAULT 0,
        "claimVersion" integer                  NOT NULL DEFAULT 0,
        "lastError"    text,
        "createdDate"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "claimedAt"    TIMESTAMP WITH TIME ZONE,
        "visibleAt"    TIMESTAMP WITH TIME ZONE,
        "deliveredAt"  TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "chk_collab_lifecycle_outbox_status"
          CHECK ("status" IN ('pending', 'inflight', 'delivered')),
        CONSTRAINT "chk_collab_lifecycle_outbox_event"
          CHECK ("eventType" IN ('document.deleted'))
      )
    `);
    // Pending claim: the dispatcher claims pending rows SEPARATELY from stale
    // in-flight ones (CollaborationLifecycleDispatcherService.claimPending) —
    //   WHERE status='pending' AND (visibleAt IS NULL OR visibleAt <= now())
    //   ORDER BY "createdDate" LIMIT 1
    // "createdDate" LEADS so the scan returns oldest-first with NO sort;
    // "visibleAt" trails for the visibility filter. EXPLAIN ANALYZE on ~8k
    // pending rows: Index Scan using this index, no Sort, no Seq Scan. (A single
    // OR-query over both status partitions would instead force a full Sort of the
    // claimable set — the reason the claim is split.) Partial on status='pending'
    // so only claimable rows are indexed.
    await queryRunner.query(`
      CREATE INDEX "idx_collab_lifecycle_outbox_pending"
        ON "collaboration_lifecycle_outbox" ("createdDate", "visibleAt")
        WHERE "status" = 'pending'
    `);
    // Stale-claim recovery: reclaim rows stuck 'inflight' past the lease (a pod
    // crashed after claim, before it could mark delivered / back off) —
    //   WHERE status='inflight' AND claimedAt < now()-lease ORDER BY "claimedAt" LIMIT 1
    // This index drives BOTH the predicate and the order (Index Scan, no Sort),
    // and being partial it scans only in-flight claims, never the whole outbox.
    await queryRunner.query(`
      CREATE INDEX "idx_collab_lifecycle_outbox_inflight"
        ON "collaboration_lifecycle_outbox" ("claimedAt")
        WHERE "status" = 'inflight'
    `);
    // Retention prune: DELETE WHERE status='delivered' AND "deliveredAt" < cutoff.
    // Keyed on "deliveredAt" (not "createdDate") so a long-pending row keeps the
    // full retention window after it finally delivers. Partial index so the
    // prune never sequential-scans accumulated delivered rows.
    await queryRunner.query(`
      CREATE INDEX "idx_collab_lifecycle_outbox_delivered"
        ON "collaboration_lifecycle_outbox" ("deliveredAt")
        WHERE "status" = 'delivered'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "collaboration_lifecycle_outbox"`
    );
  }
}
