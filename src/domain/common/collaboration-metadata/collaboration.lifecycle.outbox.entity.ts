import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CollaborationLifecycleEvent } from './collaboration.lifecycle.event.pattern';

/**
 * Transactional outbox for the durable owner-driven `document.deleted`
 * lifecycle event (FR-006/FR-023). A row is inserted in the SAME DB transaction
 * as the leaf Memo/Whiteboard removal, so a crash between the delete commit and
 * the broker publish can no longer lose the purge (the old fire-and-forget
 * `emit` could). `CollaborationLifecycleDispatcherService` claims a row with
 * `FOR UPDATE SKIP LOCKED`, publishes a confirmed persistent message on the
 * dedicated lifecycle queue, and marks it delivered — at-least-once, since the
 * downstream Purge is idempotent. `document.deleted` is the only event carried.
 *
 * Server-owned (unlike the Go-owned `file_backup_outbox`, which server never
 * touches at runtime): a real TypeORM entity with camelCase columns per the
 * server naming strategy.
 *
 * `claimVersion` is a per-row claim token: the claim increments it, and every
 * terminal write (mark-delivered / back-off) requires the exact value, so a
 * worker whose lease lapsed and was reclaimed can never reverse the current
 * owner's outcome. The payload is not stored — it is derived as `{ id:
 * documentId }` at publish time. `deliveredAt` (not `createdDate`) drives
 * retention, so a row that sat pending for days is still retained for the full
 * window after it finally delivers.
 */
@Entity('collaboration_lifecycle_outbox')
export class CollaborationLifecycleOutbox {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'uuid', nullable: false })
  documentId!: string;

  @Column({ type: 'varchar', length: 32, nullable: false })
  eventType!: CollaborationLifecycleEvent;

  @Column({ type: 'varchar', length: 16, nullable: false, default: 'pending' })
  status!: string;

  @Column({ type: 'int', nullable: false, default: 0 })
  attempts!: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  claimVersion!: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdDate!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  claimedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  visibleAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;
}
