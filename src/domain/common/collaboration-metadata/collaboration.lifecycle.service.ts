import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CollaborationLifecycleOutbox } from './collaboration.lifecycle.outbox.entity';

/**
 * Records the durable owner-driven lifecycle event (`document.deleted`,
 * FR-006/FR-023) into the transactional outbox. The row is inserted with the
 * caller's `EntityManager`, so it commits ATOMICALLY with the leaf Memo/
 * Whiteboard removal — a crash between the delete commit and the broker publish
 * can no longer lose the purge (the previous fire-and-forget `emit` could, and
 * it went to the server's own responder queue rather than the collab service).
 * `CollaborationLifecycleDispatcherService` does the confirmed persistent
 * publish out-of-band; nothing is emitted inline here. `document.deleted` is the
 * only lifecycle event produced.
 */
@Injectable()
export class CollaborationLifecycleService {
  /**
   * Enqueue `document.deleted` for `id` in the SAME transaction as the leaf
   * removal. REQUIRED at the delete-cascade leaves so the collab service
   * disconnects clients and releases/purges the live room. A lost event leaves
   * an unpurged room editable on a deleted document — NOT a retained blob: the
   * checkpoint is already gone with the profile/bucket cascade. The drain derives
   * the constant wire pattern + payload (`document.deleted { id }`) at publish
   * time, so the row stores only `documentId` (plus its generated id/createdDate).
   */
  public async enqueueDocumentDeleted(
    manager: EntityManager,
    id: string
  ): Promise<void> {
    await manager.insert(CollaborationLifecycleOutbox, {
      documentId: id,
    });
  }
}
