import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Transactional outbox for the durable owner-driven `document.deleted` lifecycle event
 * (FR-006/FR-023). A row is inserted in the SAME DB transaction as the leaf
 * Memo/Whiteboard removal, so a crash between the delete commit and the broker publish
 * cannot lose the purge.
 *
 * `document.deleted` is the ONLY event this outbox carries, so the drain
 * (`CollaborationLifecycleDispatcherService`) DERIVES the pattern/payload at publish
 * time; the row is just `{ id, documentId, createdDate }`. Multi-pod safety comes solely
 * from the drain's row lock + `SKIP LOCKED`, so there is deliberately no status / lease /
 * attempts / retention state.
 *
 * Server-owned (unlike the Go-owned `file_backup_outbox`, which the server never touches
 * at runtime): a real TypeORM entity with camelCase columns per the server naming strategy.
 */
@Entity('collaboration_lifecycle_outbox')
export class CollaborationLifecycleOutbox {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'uuid', nullable: false })
  documentId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdDate!: Date;
}
