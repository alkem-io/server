import { EntityManager } from 'typeorm';
import { vi } from 'vitest';
import { CollaborationLifecycleEvent } from './collaboration.lifecycle.event.pattern';
import { CollaborationLifecycleOutbox } from './collaboration.lifecycle.outbox.entity';
import { CollaborationLifecycleService } from './collaboration.lifecycle.service';

describe('CollaborationLifecycleService', () => {
  const service = new CollaborationLifecycleService();

  it('enqueues a pending document.deleted outbox row via the caller transaction manager', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const manager = { insert } as unknown as EntityManager;

    await service.enqueueDocumentDeleted(manager, 'doc-1');

    // Inserted with the PASSED manager (so it commits atomically with the leaf
    // removal), status 'pending', documentId the collab Purge needs. No payload
    // or content type is stored — the dispatcher derives `{ id }` at publish.
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(CollaborationLifecycleOutbox, {
      documentId: 'doc-1',
      eventType: CollaborationLifecycleEvent.DELETED,
      status: 'pending',
    });
  });
});
