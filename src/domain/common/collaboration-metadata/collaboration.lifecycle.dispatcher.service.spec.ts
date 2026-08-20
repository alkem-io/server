import { LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { Repository } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { CollaborationLifecycleDispatcherService } from './collaboration.lifecycle.dispatcher.service';
import { CollaborationLifecycleOutbox } from './collaboration.lifecycle.outbox.entity';

const CLAIMED = {
  id: '1',
  documentId: 'doc-1',
  eventType: 'document.deleted',
  claimVersion: 7,
  attempts: 0,
};

describe('CollaborationLifecycleDispatcherService', () => {
  let query: Mock;
  let emit: Mock;
  let repo: Repository<CollaborationLifecycleOutbox>;
  let client: ClientProxy;
  let logger: LoggerService;
  // FIFOs the two claim queries hand back, then empty (loop ends). `claimResults`
  // = the pending claim (the common path most tests use); `inflightClaims` = the
  // stale-inflight reclaim.
  let claimResults: unknown[][];
  let inflightClaims: unknown[][];
  // Rows the backoff UPDATE ... RETURNING returns: a fresh claimant updates its
  // row ([{id}]); a stale claimant (claimVersion advanced) matches nothing ([]).
  let backoffResult: unknown[];

  const build = (schedulerRegistry?: SchedulerRegistry) =>
    new CollaborationLifecycleDispatcherService(
      repo,
      schedulerRegistry,
      client,
      logger
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    claimResults = [];
    inflightClaims = [];
    backoffResult = [{ id: '1' }]; // default: fresh claimant, row backed off
    query = vi.fn().mockImplementation((sql: string) => {
      if (typeof sql !== 'string') {
        return Promise.resolve([]);
      }
      if (sql.includes('"visibleAt" IS NULL')) {
        return Promise.resolve(claimResults.shift() ?? []); // claimPending
      }
      if (sql.includes('"claimedAt" < now()')) {
        return Promise.resolve(inflightClaims.shift() ?? []); // claimStaleInflight
      }
      if (sql.includes(`SET "status" = 'delivered'`)) {
        return Promise.resolve([{ id: '1' }]); // mark: one row affected
      }
      if (sql.includes(`"attempts" = "attempts" + 1`)) {
        return Promise.resolve(backoffResult); // backoff UPDATE ... RETURNING
      }
      return Promise.resolve([]); // prune
    });
    emit = vi.fn();
    repo = { query } as unknown as Repository<CollaborationLifecycleOutbox>;
    client = { emit } as unknown as ClientProxy;
    logger = { warn: vi.fn(), error: vi.fn() } as unknown as LoggerService;
  });

  describe('tick', () => {
    it('publishes the derived {id} payload and marks delivered, fenced by claimVersion, after the confirm', async () => {
      claimResults = [[CLAIMED]]; // one row, then the loop claim returns empty
      emit.mockReturnValue(of(undefined)); // confirmed publish

      await build().tick();

      expect(emit).toHaveBeenCalledWith('document.deleted', { id: 'doc-1' });
      const markDelivered = query.mock.calls.find(
        c =>
          typeof c[0] === 'string' &&
          c[0].includes(`SET "status" = 'delivered'`)
      );
      expect(markDelivered).toBeTruthy();
      // Terminal write is fenced on id + the exact claimVersion we claimed with.
      expect(markDelivered?.[1]).toEqual(['1', 7]);
    });

    it('backs off (fenced by claimVersion, never marks delivered) when the publish fails', async () => {
      claimResults = [[CLAIMED]];
      emit.mockReturnValue(throwError(() => new Error('broker down')));

      await build().tick();

      const backoff = query.mock.calls.find(
        c =>
          typeof c[0] === 'string' &&
          c[0].includes(`"attempts" = "attempts" + 1`)
      );
      expect(backoff).toBeTruthy();
      // id, maxBackoff, message, lastErrorMax, claimVersion.
      expect(backoff?.[1]).toEqual(['1', 300, 'broker down', 500, 7]);
      const markDelivered = query.mock.calls.find(
        c =>
          typeof c[0] === 'string' &&
          c[0].includes(`SET "status" = 'delivered'`)
      );
      expect(markDelivered).toBeFalsy();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('logs a lapsed-claim failure (NOT a backoff) when the failing claimant was already reclaimed', async () => {
      claimResults = [[CLAIMED]];
      emit.mockReturnValue(throwError(() => new Error('broker down')));
      backoffResult = []; // the backoff UPDATE matches 0 rows — our claimVersion advanced

      await build().tick();

      const warnCalls = (logger.warn as unknown as Mock).mock.calls;
      const lapsed = warnCalls.find(
        c =>
          typeof c[0]?.message === 'string' &&
          c[0].message.includes('lapsed claim')
      );
      const backedOff = warnCalls.find(
        c =>
          typeof c[0]?.message === 'string' &&
          c[0].message.includes('backed off')
      );
      // We must NOT claim to have backed off a row we no longer own.
      expect(lapsed).toBeTruthy();
      expect(backedOff).toBeFalsy();
    });

    it('publishes nothing when the first claim comes back empty', async () => {
      claimResults = []; // both claim queries return empty immediately

      await build().tick();

      expect(emit).not.toHaveBeenCalled();
    });

    it('claims pending BEFORE reclaiming stale in-flight (fresh-before-reclaim order)', async () => {
      claimResults = [[CLAIMED]]; // a pending row is available
      emit.mockReturnValue(of(undefined));

      await build().tick();

      const firstClaim = query.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('FOR UPDATE SKIP LOCKED')
      );
      // The very first claim is the pending query, never the stale-inflight one.
      expect(firstClaim?.[0]).toContain('"visibleAt" IS NULL');
      expect(emit).toHaveBeenCalledWith('document.deleted', { id: 'doc-1' });
    });

    it('reclaims a stale in-flight row when no pending rows remain', async () => {
      claimResults = []; // pending exhausted
      inflightClaims = [[{ ...CLAIMED, id: '9', claimVersion: 2 }]];
      emit.mockReturnValue(of(undefined));

      await build().tick();

      const inflightClaim = query.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('"claimedAt" < now()')
      );
      expect(inflightClaim).toBeTruthy();
      expect(emit).toHaveBeenCalledWith('document.deleted', { id: 'doc-1' });
    });

    it('never throws when a claim query fails (a bad tick must not kill the scheduler)', async () => {
      query.mockImplementationOnce(() => Promise.reject(new Error('db down')));

      await expect(build().tick()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('is single-flight: a second tick while the first is mid-publish is a no-op (only one claim/publish begins)', async () => {
      const publish$ = new Subject<unknown>();
      claimResults = [[CLAIMED]]; // one row available
      emit.mockReturnValue(publish$); // first publish blocks until we complete it
      const dispatcher = build();

      const tick1 = dispatcher.tick(); // claims one row, parks on the blocked publish
      // Flush microtasks so tick1 reaches the awaited (blocked) publish.
      await new Promise(resolve => setTimeout(resolve, 0));
      await dispatcher.tick(); // second tick: the sweeping guard makes it a no-op

      const claimCalls = query.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('FOR UPDATE SKIP LOCKED')
      );
      expect(claimCalls.length).toBe(1);
      expect(emit).toHaveBeenCalledTimes(1);

      // Release the first publish so tick1 completes cleanly (also cancels the
      // rxjs timeout timer, so nothing leaks).
      publish$.next(undefined);
      publish$.complete();
      await tick1;
    });

    it('times out a hung publish and backs the row off (version-conditioned), never marking delivered', async () => {
      vi.useFakeTimers();
      try {
        claimResults = [[CLAIMED]];
        emit.mockReturnValue(NEVER); // publish never confirms
        const tickPromise = build().tick();

        // Advance past any valid publish timeout (which must be < the 60s lease).
        await vi.advanceTimersByTimeAsync(59_000);
        await tickPromise;

        const backoff = query.mock.calls.find(
          c =>
            typeof c[0] === 'string' &&
            c[0].includes(`"attempts" = "attempts" + 1`)
        );
        expect(backoff).toBeTruthy();
        // Version-conditioned: the backoff's last param is our claimVersion.
        expect(backoff?.[1]?.[4]).toBe(7);
        const markDelivered = query.mock.calls.find(
          c =>
            typeof c[0] === 'string' &&
            c[0].includes(`SET "status" = 'delivered'`)
        );
        expect(markDelivered).toBeFalsy();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('onModuleInit gating', () => {
    it('registers the sweep when both a scheduler and a client are present', () => {
      const addInterval = vi.fn();
      const reg = { addInterval } as unknown as SchedulerRegistry;

      build(reg).onModuleInit();

      expect(addInterval).toHaveBeenCalledTimes(1);
      // Clear the real interval the init created so it can't fire after the test.
      clearInterval(addInterval.mock.calls[0][1] as NodeJS.Timeout);
    });

    it('stays inert (no throw) on a process with no scheduler, even without a client', () => {
      const dispatcher = new CollaborationLifecycleDispatcherService(
        repo,
        undefined,
        undefined,
        logger
      );

      expect(() => dispatcher.onModuleInit()).not.toThrow();
    });

    it('THROWS when scheduling exists but the client is missing (DI/config failure, not warn-and-serve)', () => {
      const reg = { addInterval: vi.fn() } as unknown as SchedulerRegistry;
      const dispatcher = new CollaborationLifecycleDispatcherService(
        repo,
        reg,
        undefined,
        logger
      );

      expect(() => dispatcher.onModuleInit()).toThrow(
        /COLLABORATION_LIFECYCLE_SERVICE/
      );
    });
  });
});
