import { RmqRecord } from '@nestjs/microservices';
import { SchedulerRegistry } from '@nestjs/schedule';
import { of, Subject, throwError } from 'rxjs';
import { type Mock, vi } from 'vitest';
import { CollaborationLifecycleDispatcherService } from './collaboration.lifecycle.dispatcher.service';
import { CollaborationLifecycleEvent } from './collaboration.lifecycle.event.pattern';

// Discriminating gates for the minimal durable drain (BASIC-006). Each drainOne is one
// short transaction: SELECT oldest FOR UPDATE SKIP LOCKED -> confirmed emit while locked
// -> DELETE on confirm -> commit; failure rolls back and the row remains for the next
// drain. The mock `transaction(cb)` runs cb with a manager whose `query` returns the
// queued SELECT results (rows array) and records DELETEs.

interface Row {
  id: string;
  documentId: string;
}

/** Flush the microtask queue so a parked `await lastValueFrom(subject)` is reached. */
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

const makeService = (opts: {
  selectResults: Row[][];
  emit: Mock;
  order?: string[];
}) => {
  const queries: { sql: string; params?: unknown[] }[] = [];
  let selCall = 0;
  const managerQuery = vi.fn(async (sql: string, params?: unknown[]) => {
    queries.push({ sql, params });
    if (/SELECT/i.test(sql)) {
      opts.order?.push('select');
      return opts.selectResults[selCall++] ?? [];
    }
    if (/DELETE/i.test(sql)) {
      opts.order?.push('delete');
      return [[], 1]; // DELETE returns a [rows, count] tuple; unused here
    }
    return [];
  });
  const transaction = vi.fn(async (cb: (m: unknown) => Promise<boolean>) =>
    cb({ query: managerQuery })
  );
  const outboxRepository = { manager: { transaction } } as any;
  const client = { emit: opts.emit } as any;
  const logger = { error: vi.fn(), warn: vi.fn(), verbose: vi.fn() } as any;
  const service = new CollaborationLifecycleDispatcherService(
    outboxRepository,
    undefined,
    client,
    logger
  );
  const deletes = () => queries.filter(q => /DELETE/i.test(q.sql));
  const selects = () => queries.filter(q => /SELECT/i.test(q.sql));
  return { service, queries, transaction, client, deletes, selects };
};

const ROW: Row = {
  id: '1',
  documentId: '11111111-2222-3333-4444-555555555555',
};

describe('CollaborationLifecycleDispatcherService (minimal drain)', () => {
  it('gate 1: empty table => ZERO publishes (kills the truthy-[] loop)', async () => {
    const emit = vi.fn(() => of(undefined));
    const { service } = makeService({ selectResults: [[]], emit });

    await service.tick();

    expect(emit).not.toHaveBeenCalled();
  });

  it('gate 2: one row => one document.deleted carrying { id }, one DELETE keyed by row id', async () => {
    const emit = vi.fn(() => of(undefined));
    const { service, deletes } = makeService({
      selectResults: [[ROW], []],
      emit,
    });

    await service.tick();

    expect(emit).toHaveBeenCalledTimes(1);
    const [pattern, record] = emit.mock.calls[0] as unknown as [
      unknown,
      RmqRecord,
    ];
    expect(pattern).toBe(CollaborationLifecycleEvent.DELETED);
    expect(record).toBeInstanceOf(RmqRecord);
    // The consumer receives the record's DATA ({ id }); the options ride sendToQueue only.
    expect(record.data).toEqual({ id: ROW.documentId });
    expect(deletes()).toHaveLength(1);
    expect(deletes()[0].params).toEqual([ROW.id]);
  });

  it('gate 3: publish failure => rollback (row remains, no DELETE), a later drain succeeds', async () => {
    const emit = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('broker down')))
      .mockReturnValueOnce(of(undefined));
    const { service, deletes } = makeService({
      selectResults: [[ROW], [ROW], []],
      emit,
    });

    // Tick 1: emit throws -> the transaction rolls back -> the row is NOT deleted.
    await service.tick();
    expect(deletes()).toHaveLength(0);

    // Tick 2: the row is still there -> emit succeeds -> deleted.
    await service.tick();
    expect(emit).toHaveBeenCalledTimes(2);
    expect(deletes()).toHaveLength(1);
  });

  it('gate 4: DELETE waits for the publish to COMPLETE, not merely to be issued', async () => {
    const subject = new Subject<unknown>();
    const emit = vi.fn(() => subject.asObservable());
    const { service, deletes } = makeService({
      selectResults: [[ROW], []],
      emit,
    });

    const tickPromise = service.tick();
    await flush();
    // The publish is issued but the broker has NOT confirmed yet -> the row must NOT be
    // deleted. This is what proves the DELETE is awaited on completion (drop the await
    // and the DELETE would already have run here).
    expect(emit).toHaveBeenCalledTimes(1);
    expect(deletes()).toHaveLength(0);

    // Broker confirms -> the drain proceeds to DELETE.
    subject.next(undefined);
    subject.complete();
    await tickPromise;
    expect(deletes()).toHaveLength(1);
  });

  it('gate 5: the claim SELECT uses FOR UPDATE SKIP LOCKED (multi-pod safety from the row lock alone)', async () => {
    const emit = vi.fn(() => of(undefined));
    const { service, queries } = makeService({
      selectResults: [[ROW], []],
      emit,
    });

    await service.tick();

    const select = queries.find(q => /SELECT/i.test(q.sql));
    expect(select?.sql).toMatch(/FOR UPDATE SKIP LOCKED/);
  });

  it('gate 6: derived pattern + { id } payload; no delivered/status/prune SQL anywhere', async () => {
    const emit = vi.fn(() => of(undefined));
    const { service, queries } = makeService({
      selectResults: [[ROW], []],
      emit,
    });

    await service.tick();

    const [pattern, record] = emit.mock.calls[0] as unknown as [
      unknown,
      RmqRecord,
    ];
    expect(pattern).toBe(CollaborationLifecycleEvent.DELETED);
    expect(pattern).toBeDefined();
    expect(record.data).toEqual({ id: ROW.documentId });
    const allSql = queries.map(q => q.sql).join(' ');
    expect(allSql).not.toMatch(
      /delivered|status|attempts|claimVersion|visibleAt|claimedAt|lastError|prune/i
    );
  });

  it('gate 7: bounds a hung publish via the transport-native per-message timeout (a real cancel), not RxJS', async () => {
    const emit = vi.fn(() => of(undefined));
    const { service } = makeService({ selectResults: [[ROW], []], emit });

    await service.tick();

    // The deadline rides the RmqRecord options straight to sendToQueue, where
    // amqp-connection-manager removes a timed-out message from its queue and rejects —
    // unlike an RxJS timeout, which would leave the eager publish latent to duplicate.
    const [, record] = emit.mock.calls[0] as unknown as [
      unknown,
      RmqRecord & { options?: { timeout?: number } },
    ];
    expect(record.options?.timeout).toBe(30_000);
  });

  it('gate 8: an overlapping tick is a no-op while a drain is in flight (single-flight guard)', async () => {
    const subject = new Subject<unknown>();
    const emit = vi.fn(() => subject.asObservable());
    const { service, selects } = makeService({
      selectResults: [[ROW], []],
      emit,
    });

    const first = service.tick(); // parks at the publish (subject still open)
    await flush();
    expect(selects()).toHaveLength(1);
    expect(emit).toHaveBeenCalledTimes(1);

    // A second tick fired while the first is draining must NOT SELECT or publish;
    // otherwise two replicas-in-one-process would each hold a row lock.
    await service.tick();
    expect(selects()).toHaveLength(1);
    expect(emit).toHaveBeenCalledTimes(1);

    subject.next(undefined);
    subject.complete();
    await first;
  });

  describe('onModuleInit wiring', () => {
    it('registers the sweep interval when both scheduler and client are present', () => {
      const addInterval = vi.fn();
      const scheduler = {
        addInterval,
        doesExist: vi.fn(),
        deleteInterval: vi.fn(),
      } as unknown as SchedulerRegistry;
      const service = new CollaborationLifecycleDispatcherService(
        {} as any,
        scheduler,
        { emit: vi.fn() } as any,
        { error: vi.fn() } as any
      );

      service.onModuleInit();

      expect(addInterval).toHaveBeenCalledTimes(1);
      expect(addInterval).toHaveBeenCalledWith(
        'collaboration-lifecycle-dispatch',
        expect.anything()
      );
      // Clear the real timer the service created so it does not leak across tests.
      clearInterval(
        addInterval.mock.calls[0][1] as ReturnType<typeof setInterval>
      );
    });

    it('throws on a scheduling process with no outbound client (would silently strand deletions)', () => {
      const scheduler = {
        addInterval: vi.fn(),
        doesExist: vi.fn(),
        deleteInterval: vi.fn(),
      } as unknown as SchedulerRegistry;
      const service = new CollaborationLifecycleDispatcherService(
        {} as any,
        scheduler,
        undefined, // no client
        { error: vi.fn() } as any
      );
      expect(() => service.onModuleInit()).toThrow(
        /COLLABORATION_LIFECYCLE_SERVICE client is missing/
      );
    });

    it('is inert (no throw, no interval) on a process with no scheduler (e.g. the worker)', () => {
      const addInterval = vi.fn();
      const service = new CollaborationLifecycleDispatcherService(
        {} as any,
        undefined, // no scheduler
        undefined, // no client — must NOT throw because there is no scheduler
        { error: vi.fn() } as any
      );
      expect(() => service.onModuleInit()).not.toThrow();
      expect(addInterval).not.toHaveBeenCalled();
    });
  });
});
