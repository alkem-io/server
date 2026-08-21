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
import {
  ClientProxy,
  RmqRecordBuilder,
  type RmqRecordOptions,
} from '@nestjs/microservices';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { CollaborationLifecycleEvent } from './collaboration.lifecycle.event.pattern';
import { CollaborationLifecycleOutbox } from './collaboration.lifecycle.outbox.entity';

const SWEEP_INTERVAL_NAME = 'collaboration-lifecycle-dispatch';
const SWEEP_INTERVAL_MS = 5_000;

/**
 * Per-message publish deadline, delegated to the transport. amqp-connection-manager
 * treats `timeout` as a real cancel: on expiry it removes the message from its send
 * queue and rejects — so a broker outage cannot leave a latent duplicate publish. (An
 * RxJS timeout on `emit` cannot: `ClientProxy.emit` connects eagerly, so unsubscribing
 * does not cancel the already-queued publish.) On rejection the drain transaction rolls
 * back, the row remains, and the next sweep retries.
 */
const PUBLISH_TIMEOUT_MS = 30_000;

/** amqp-connection-manager's per-message `timeout` is absent from Nest's RmqRecordOptions. */
type RmqPublishOptions = RmqRecordOptions & { timeout: number };

/** Shape of the row claimed by `SELECT … FOR UPDATE SKIP LOCKED`. */
interface OutboxRow {
  id: string;
  documentId: string;
}

/**
 * Minimal durable drain for the `collaboration_lifecycle_outbox` (FR-006/FR-023).
 *
 * One drain = one short transaction: claim the oldest row `FOR UPDATE SKIP LOCKED`; if
 * none, commit a no-op; else publish a confirmed persistent `document.deleted { id }`
 * WHILE the row lock is held, DELETE the row on broker confirm, and commit. A publish
 * failure/timeout throws → the transaction rolls back (row remains, lock releases) →
 * retried on the next sweep. The DELETE runs only after the broker confirm, so a crash
 * before commit redelivers (at-least-once); the downstream Purge is idempotent, so a
 * duplicate is safe. Multi-pod safety comes solely from the row lock + `SKIP LOCKED`.
 *
 * `SchedulerRegistry` and the client are both `@Optional()`: a process with no scheduler
 * (e.g. the auth-reset worker) is inert; a scheduling process with a missing client
 * throws at init rather than silently strand every deletion.
 */
@Injectable()
export class CollaborationLifecycleDispatcherService
  implements OnModuleInit, OnModuleDestroy
{
  private draining = false;
  private destroyed = false;

  constructor(
    @InjectRepository(CollaborationLifecycleOutbox)
    private readonly outboxRepository: Repository<CollaborationLifecycleOutbox>,
    // Explicit @Inject so a future widening of the type cannot make Nest inject
    // `undefined` on the scheduling process too, silently disabling the drain
    // everywhere (cf. ConversationDigestSweepService).
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
      // No scheduler in this module graph (e.g. the auth-reset worker): being inert is
      // correct. Checked BEFORE the client so a worker never trips the missing-client throw.
      return;
    }
    if (!this.client) {
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
    this.destroyed = true;
    if (this.schedulerRegistry?.doesExist('interval', SWEEP_INTERVAL_NAME)) {
      this.schedulerRegistry.deleteInterval(SWEEP_INTERVAL_NAME);
    }
  }

  /**
   * Drain rows one at a time until the table is empty (or the process is shutting down).
   *
   * The single-flight guard (`draining`) is load-bearing: `setInterval` does not await
   * the callback, so overlapping ticks would each hold a row lock; the synchronous
   * check-and-set makes a tick fired while one runs a no-op. Wrapped end-to-end so a
   * throwing drain (e.g. a publish timeout) cannot kill the scheduler (no supervisor).
   */
  async tick(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;
    try {
      while (!this.destroyed && (await this.drainOne())) {
        // keep draining while rows remain
      }
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Collaboration lifecycle drain failed',
          error: error?.message,
        },
        error?.stack,
        LogContext.COLLABORATION
      );
    } finally {
      this.draining = false;
    }
  }

  /**
   * Drain ONE row inside a short transaction that holds the row lock across the
   * confirmed publish. Returns `true` if a row was published + deleted (drain again),
   * `false` if there was nothing to drain.
   */
  private async drainOne(): Promise<boolean> {
    const client = this.client!; // the tick only runs on a scheduling process
    return this.outboxRepository.manager.transaction(async manager => {
      // A SELECT returns the rows array directly (the [rows, count] tuple is UPDATE/
      // DELETE only), so rows[0] is the row or undefined.
      const rows: OutboxRow[] = await manager.query(
        `SELECT "id", "documentId"
         FROM "collaboration_lifecycle_outbox"
         ORDER BY "id"
         FOR UPDATE SKIP LOCKED
         LIMIT 1`
      );
      const row = rows[0];
      if (!row) {
        return false;
      }
      // The emit observable resolves on the broker ack (confirm channel); the
      // per-message timeout bounds a hung publish by removing it and rejecting. Payload
      // is the derived constant document.deleted { id } — never a stored value. The
      // options ride sendToQueue only (persistent stays at client config) and are not
      // serialized into the wire body, so the consumer still receives { id }.
      const publishOptions: RmqPublishOptions = { timeout: PUBLISH_TIMEOUT_MS };
      const record = new RmqRecordBuilder({ id: row.documentId })
        .setOptions(publishOptions)
        .build();
      await lastValueFrom(
        client.emit(CollaborationLifecycleEvent.DELETED, record)
      );
      await manager.query(
        `DELETE FROM "collaboration_lifecycle_outbox" WHERE "id" = $1`,
        [row.id]
      );
      return true;
    });
  }
}
