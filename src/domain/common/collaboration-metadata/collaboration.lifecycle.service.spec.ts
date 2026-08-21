import { EntityManager } from 'typeorm';
import { vi } from 'vitest';
import { CollaborationLifecycleOutbox } from './collaboration.lifecycle.outbox.entity';
import { CollaborationLifecycleService } from './collaboration.lifecycle.service';

describe('CollaborationLifecycleService', () => {
  const service = new CollaborationLifecycleService();

  it('enqueues a document.deleted outbox row via the caller transaction manager (same-tx as the leaf removal)', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const manager = { insert } as unknown as EntityManager;

    await service.enqueueDocumentDeleted(manager, 'doc-1');

    // Inserted with the PASSED manager, so it commits ATOMICALLY with the leaf
    // Memo/Whiteboard removal. The row stores ONLY documentId (id/createdDate are
    // generated) — no eventType/status/payload: the drain derives the constant
    // `document.deleted { id }` at publish time.
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(CollaborationLifecycleOutbox, {
      documentId: 'doc-1',
    });
  });
});
