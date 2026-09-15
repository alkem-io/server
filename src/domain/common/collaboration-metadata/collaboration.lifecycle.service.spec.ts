import { RmqRecord } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CollaborationLifecycleEvent } from './collaboration.lifecycle.event.pattern';
import { CollaborationLifecycleService } from './collaboration.lifecycle.service';

describe('CollaborationLifecycleService', () => {
  it('awaits a confirmed document.deleted publish before resolving', async () => {
    const emit = vi.fn().mockReturnValue(of(undefined));
    const service = new CollaborationLifecycleService({ emit } as any);

    await service.publishDocumentDeleted('doc-1');

    expect(emit).toHaveBeenCalledTimes(1);
    const [pattern, record] = emit.mock.calls[0] as [string, RmqRecord<string>];
    expect(pattern).toBe(CollaborationLifecycleEvent.DELETED);
    expect(record.data).toEqual({ id: 'doc-1' });
    expect(record.options).toEqual({ timeout: 30_000 });
  });

  it('fails before deletion when RabbitMQ does not confirm the publish', async () => {
    const emit = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('broker unavailable')));
    const service = new CollaborationLifecycleService({ emit } as any);

    await expect(service.publishDocumentDeleted('doc-1')).rejects.toThrow(
      'broker unavailable'
    );
  });

  it('fails explicitly in worker contexts without the lifecycle client', async () => {
    const service = new CollaborationLifecycleService(undefined);

    await expect(service.publishDocumentDeleted('doc-1')).rejects.toThrow(
      /client is unavailable/
    );
  });
});
