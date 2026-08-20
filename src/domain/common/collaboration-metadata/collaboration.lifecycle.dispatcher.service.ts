import { COLLABORATION_LIFECYCLE_SERVICE } from '@common/constants/providers';
import { LogContext } from '@common/enums';
import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { lastValueFrom, timeout } from 'rxjs';
import { Repository } from 'typeorm';
import { CollaborationLifecycleOutbox } from './collaboration.lifecycle.outbox.entity';

const SWEEP_INTERVAL_NAME = 'collaboration-lifecycle-dispatch';
/** Sweep cadence. Each tick drains claim-one/deliver up to the bound, then prunes. */
const SWEEP_INTERVAL_MS = 5_000;
/** Upper bound on rows one replica processes per tick (claimed one at a time). */
const MAX_ROWS_PER_TICK = 100;
/** Lease after which an in-flight row is considered crashed and reclaimable. */
const CLAIM_LEASE_SECONDS = 60;
/**
 * Bound on one publish. Without it a broker outage/reconnect leaves the confirm
 * observable pending forever, wedging the (single-flight) dispatcher while other
 * replicas repeatedly reclaim the expired lease. A timeout flows through the
 * normal version-conditioned backoff, releasing the claim. It MUST be strictly
 * below the lease (asserted below) so the row backs off before another replica
 * can reclaim a row this one is still publishing.
 */
const PUBLISH_TIMEOUT_MS = 30_000;
if (PUBLISH_TIMEOUT_MS >= CLAIM_LEASE_SECONDS * 1000) {
  throw new Error(
    'CollaborationLifecycleDispatcher misconfigured: PUBLISH_TIMEOUT_MS must be strictly below CLAIM_LEASE_SECONDS.'
  );
}
/** Cap on the exponential publish-failure backoff. */
const MAX_BACKOFF_SECONDS = 300;
/** Truncate persisted `lastError` so a broker error string can't bloat the row. */
const LAST_ERROR_MAX = 500;
/** Delivered rows older than this (by deliveredAt) are pruned each sweep. */
const DELIVERED_RETENTION_DAYS = 7;

/** Shape returned by the claim UPDATE ... RETURNING. */
interface ClaimedRow {
  id: string;
  documentId: string;
  eventType: string;
  claimVersion: number;
  attempts: number;
}

/**
 * 006-collab-content-unification — the dispatcher for the transactional
 * lifecycle outbox. Publishes the durable `document.deleted` events recorded by
 * `CollaborationLifecycleService.enqueueDocumentDeleted` to the dedicated,
 * durable `COLLABORATION_LIFECYCLE` queue with a confirmed persistent publish.
 *
 * Multi-pod safe: every replica sweeps; each row is claimed by a single
 * `FOR UPDATE SKIP LOCKED` UPDATE, so two replicas never grab the same row. A
 * row is claimed ONE at a time (not a batch): a broker outage blocks at most one
 * leased row per replica instead of leaving 99 batch-leased rows to expire and
 * be reclaimed into a duplicate storm. The claim bumps a `claimVersion` fence
 * token; the terminal writes (mark-delivered / back-off) require the exact
 * token, so a worker whose lease lapsed and was reclaimed can neither mark the
 * new owner's row delivered nor requeue it. A row is marked `delivered` ONLY
 * after the publish observable completes (broker confirm) — a crash after
 * confirm but before the mark leaves it `inflight` to be redelivered once the
 * lease lapses (idempotent Purge). A publish failure clears the claim,
 * increments `attempts`, and backs the row off with a capped exponential
 * `visibleAt`; nothing is ever silently dropped.
 *
 * `SchedulerRegistry` and the outbound client are BOTH injected `@Optional()`.
 * On a process with no scheduler (e.g. the auth-reset worker) the dispatcher is
 * silently inert — that process does not publish deletions. On a scheduling
 * process (the API, via `ScheduleModule.forRoot()` in `AppModule`) a MISSING
 * client is a DI/config failure that would silently strand every deletion, so
 * it THROWS at init rather than warn-and-serve.
 */
@Injectable()
export class CollaborationLifecycleDispatcherService
  implements OnModuleInit, OnModuleDestroy
{
  private sweeping = false;

  constructor(
    @InjectRepository(CollaborationLifecycleOutbox)
    private readonly outboxRepository: Repository<CollaborationLifecycleOutbox>,
    // See `ConversationDigestSweepService`: `@Inject` is explicit so a future
    // widening of the type cannot make Nest inject `undefined` on the scheduling
    // process too, silently disabling the dispatcher everywhere.
    @Optional()
    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry | undefined,
    @Optional()
    @Inject(COLLABORATION_LIFECYCLE_SERVICE)
    private readonly client: ClientProxy | undefined,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  onModuleInit(): void {
    if (!this.schedulerRegistry) {
      // No scheduler in this module graph (e.g. the auth-reset worker). That
      // process does not publish deletions, so being inert is correct — check
      // this BEFORE the client so a worker never trips the missing-client throw.
      return;
    }
    if (!this.client) {
      // We schedule but have no outbound client: deletions would be recorded in
      // the outbox and never published. That is a DI/config failure on the
      // process that owns publishing — fail fast, do not warn-and-serve.
      throw new Error(
        'CollaborationLifecycleDispatcherService: COLLABORATION_LIFECYCLE_SERVICE client is missing on a scheduling process - document.deleted events would never be published. Check MicroservicesModule wiring.'
      );
    }
    const interval = setInterval(() => {
      void this.tick();
    }, SWEEP_INTERVAL_MS);
    this.schedulerRegistry.addInterval(SWEEP_INTERVAL_NAME, interval);
  }

  onModuleDestroy(): void {
    if (!this.schedulerRegistry) {
      return;
    }
    if (this.schedulerRegistry.doesExist('interval', SWEEP_INTERVAL_NAME)) {
      this.schedulerRegistry.deleteInterval(SWEEP_INTERVAL_NAME);
    }
  }

  /**
   * One sweep tick. Wrapped end-to-end in try/catch: a throwing tick must not
   * kill the scheduler (there is no supervisor to restart it).
   *
   * Single-flight guard (`sweeping`): `SchedulerRegistry`/`setInterval` does NOT
   * await the previous async callback, so ticks would otherwise overlap. The
   * synchronous check-and-set below (no await between them) makes a second tick
   * fired while one is running a no-op — so "at most one leased row per replica"
   * actually holds. Cleared in `finally`. Combined with claim-one-at-a-time and
   * the publish timeout, a blocked publish holds exactly one leased row and the
   * guard always clears.
   */
  async tick(): Promise<void> {
    if (this.sweeping) {
      return;
    }
    this.sweeping = true;
    try {
      for (let i = 0; i < MAX_ROWS_PER_TICK; i++) {
        const row = await this.claimOne();
        if (!row) {
          break;
        }
        await this.deliver(row);
      }
      await this.prune();
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Collaboration lifecycle dispatch tick failed',
          error: error?.message,
        },
        error?.stack,
        LogContext.COLLABORATION
      );
    } finally {
      this.sweeping = false;
    }
  }

  /**
   * Claim a SINGLE row: a pending row past its backoff FIRST (fresh events),
   * then — only if none — reclaim a stale in-flight row (a claim crashed past
   * its lease). Split into two queries on purpose: a single OR over both status
   * partitions forces a full Sort of the claimable set to satisfy `ORDER BY`
   * (EXPLAIN-verified), whereas each half is an ordered index scan with NO sort —
   * pending by `"createdDate"` (idx_collab_lifecycle_outbox_pending), stale
   * in-flight by `"claimedAt"` (idx_collab_lifecycle_outbox_inflight). Pending
   * before reclaim is also the right priority: deliver fresh events before
   * retrying a crashed one. `FOR UPDATE SKIP LOCKED` keeps concurrent replicas
   * off the same row; the `claimVersion` bump fences the prior (lapsed) claimant
   * out of the terminal writes.
   */
  private async claimOne(): Promise<ClaimedRow | undefined> {
    return (await this.claimPending()) ?? (await this.claimStaleInflight());
  }

  /** Claim the oldest pending row whose backoff has elapsed (createdDate order). */
  private async claimPending(): Promise<ClaimedRow | undefined> {
    const rows: ClaimedRow[] = await this.outboxRepository.query(
      `
      UPDATE "collaboration_lifecycle_outbox"
      SET "status" = 'inflight', "claimedAt" = now(), "claimVersion" = "claimVersion" + 1
      WHERE "id" = (
        SELECT "id" FROM "collaboration_lifecycle_outbox"
        WHERE "status" = 'pending' AND ("visibleAt" IS NULL OR "visibleAt" <= now())
        ORDER BY "createdDate"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING "id", "documentId", "eventType", "claimVersion", "attempts"
      `
    );
    return rows[0];
  }

  /**
   * Reclaim the oldest-lease stale in-flight row (claimedAt order). Already
   * `inflight`, so this only re-leases (`claimedAt`) and bumps `claimVersion`;
   * the crashed claimant is fenced out of its terminal write by the version.
   */
  private async claimStaleInflight(): Promise<ClaimedRow | undefined> {
    const rows: ClaimedRow[] = await this.outboxRepository.query(
      `
      UPDATE "collaboration_lifecycle_outbox"
      SET "claimedAt" = now(), "claimVersion" = "claimVersion" + 1
      WHERE "id" = (
        SELECT "id" FROM "collaboration_lifecycle_outbox"
        WHERE "status" = 'inflight' AND "claimedAt" < now() - make_interval(secs => $1::int)
        ORDER BY "claimedAt"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING "id", "documentId", "eventType", "claimVersion", "attempts"
      `,
      [CLAIM_LEASE_SECONDS]
    );
    return rows[0];
  }

  /**
   * Publish one claimed row. The publish observable completes on broker confirm
   * (persistent delivery); ONLY then is the row marked delivered — and only if
   * it still carries our `claimVersion` (a lapsed-and-reclaimed row is left to
   * its new owner). A failure backs the row off instead — never a silent drop.
   */
  private async deliver(row: ClaimedRow): Promise<void> {
    try {
      // Non-null: the tick only runs when the client is present (onModuleInit).
      // Payload derived here — not stored — it is always `{ id: documentId }`.
      //
      // Confirmed publish: Nest ClientRMQ.dispatchEvent resolves emit's
      // observable from the ChannelWrapper.sendToQueue callback, and
      // amqp-connection-manager (4.1.15) defaults to a confirm channel
      // (`_confirm` = true -> createConfirmChannel), invoking that callback from
      // amqplib's publisher-confirm ack — so completion here is a BROKER confirm,
      // not a local accept. `timeout` bounds a hung publish so it flows through
      // backoff instead of wedging the sweep; the source is unsubscribed on
      // timeout but the in-flight AMQP message may still be delivered later —
      // harmless at-least-once (idempotent Purge).
      await lastValueFrom(
        this.client!.emit(row.eventType, { id: row.documentId }).pipe(
          timeout({ each: PUBLISH_TIMEOUT_MS })
        )
      );
      await this.outboxRepository.query(
        `UPDATE "collaboration_lifecycle_outbox"
         SET "status" = 'delivered', "deliveredAt" = now(), "claimedAt" = NULL
         WHERE "id" = $1 AND "status" = 'inflight' AND "claimVersion" = $2`,
        [row.id, row.claimVersion]
      );
    } catch (error: any) {
      await this.backoff(row, error);
    }
  }

  /**
   * Release a failed row back to pending with an incremented attempt count and a
   * capped exponential `visibleAt` backoff — guarded by `claimVersion` so a
   * lapsed worker's late failure cannot requeue the new owner's delivered row.
   * `attempts` grows unbounded (observability, not a discard threshold): a
   * poison row keeps retrying at the capped interval rather than being dropped.
   */
  private async backoff(row: ClaimedRow, error: any): Promise<void> {
    const updated: Array<{ id: string }> = await this.outboxRepository.query(
      `UPDATE "collaboration_lifecycle_outbox"
       SET "status" = 'pending',
           "attempts" = "attempts" + 1,
           "claimedAt" = NULL,
           "visibleAt" = now() + make_interval(
             secs => LEAST($2::int, POWER(2, LEAST("attempts" + 1, 8))::int)
           ),
           "lastError" = LEFT($3, $4)
       WHERE "id" = $1 AND "status" = 'inflight' AND "claimVersion" = $5
       RETURNING "id"`,
      [
        row.id,
        MAX_BACKOFF_SECONDS,
        String(error?.message ?? 'publish failed'),
        LAST_ERROR_MAX,
        row.claimVersion,
      ]
    );
    if (updated.length === 0) {
      // Our lease lapsed and the row was reclaimed by another worker (the
      // claimVersion no longer matches), so this UPDATE changed nothing. The
      // publish still failed — log it as a failed attempt, but do NOT claim to
      // have backed off a row we no longer own (the new owner is handling it).
      this.logger.warn?.(
        {
          message:
            'Collaboration lifecycle publish failed on a lapsed claim - row already reclaimed, no backoff applied',
          outboxId: row.id,
          documentId: row.documentId,
          eventType: row.eventType,
          error: error?.message,
        },
        LogContext.COLLABORATION
      );
      return;
    }
    this.logger.warn?.(
      {
        message: 'Collaboration lifecycle publish failed - backed off',
        outboxId: row.id,
        documentId: row.documentId,
        eventType: row.eventType,
        attempt: row.attempts + 1,
        error: error?.message,
      },
      LogContext.COLLABORATION
    );
  }

  /**
   * Drop delivered rows past the retention window (by deliveredAt, so a
   * long-pending row is retained for the full window after it finally delivers)
   * to keep the outbox bounded.
   */
  private async prune(): Promise<void> {
    await this.outboxRepository.query(
      `DELETE FROM "collaboration_lifecycle_outbox"
       WHERE "status" = 'delivered'
         AND "deliveredAt" < now() - make_interval(days => $1::int)`,
      [DELIVERED_RETENTION_DAYS]
    );
  }
}
