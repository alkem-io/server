import { LogContext } from '@common/enums';
import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversationDigestFlushService } from './conversation.digest.flush.service';
import { ConversationDigestSchedulerService } from './conversation.digest.scheduler.service';

const SWEEP_INTERVAL_NAME = 'messaging-digest-sweep';

/**
 * How many due tracks one replica claims per tick. Bounds a single tick's
 * work; anything not claimed stays in the due queue (its score is in the
 * past) and is picked up by the next tick or another replica.
 */
const SWEEP_BATCH_SIZE = 200;

/** Concurrent flushes per tick. Each flush is DB + one RPC + one dispatch. */
const SWEEP_CONCURRENCY = 10;

/**
 * 034-messaging-notifications — FR-021 / D-25.
 *
 * The periodic sweep. EVERY replica runs it; each due track is claimed by an
 * atomic `ZREM` (the replica whose remove returns 1 owns the flush), so there
 * is no leader election and no distributed lock.
 *
 * Interval rather than `@Cron`: the period is configuration
 * (`sweep_interval_seconds`) and `CronExpression` constants cannot express
 * "every N seconds" from config. Registered through `SchedulerRegistry` so it
 * is visible to Nest's scheduler and torn down cleanly on shutdown.
 *
 * `SchedulerRegistry` is injected `@Optional()`, and that is load-bearing.
 * `MessageInboxModule` is reachable from `AuthResetWorkerModule`
 * (AuthResetSubscriberModule -> SpaceModule -> CommunityModule ->
 * CommunicationModule -> MessageInboxModule), and that worker deliberately
 * does NOT import `ScheduleModule` — see `auth-reset.worker.module.ts`. A
 * REQUIRED dependency here therefore does not "keep the sweep off the
 * worker", it makes `NestFactory.create(AuthResetWorkerModule)` fail to
 * resolve this provider and crash-loops the pod. Optional injection gives the
 * intended behaviour instead: the sweep is registered wherever scheduling
 * exists (the API process, via `ScheduleModule.forRoot()` in `AppModule`) and
 * is quietly absent everywhere else. The absence is logged, not silent, so a
 * `ScheduleModule` regression in `AppModule` cannot stop the sweep unnoticed.
 */
@Injectable()
export class ConversationDigestSweepService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly enabled: boolean;
  private sweeping = false;

  constructor(
    private readonly digestSchedulerService: ConversationDigestSchedulerService,
    private readonly digestFlushService: ConversationDigestFlushService,
    // `@Inject` is explicit on purpose: with only `@Optional()` the emitted
    // `design:paramtypes` entry for an optional param is still the class, but
    // any future widening of this type (e.g. `SchedulerRegistry | null`) makes
    // TypeScript emit `Object` and Nest silently injects `undefined` on the
    // API process too — turning the sweep off everywhere.
    @Optional()
    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry | undefined,
    configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    // FR-016 — the kill switch disables the WHOLE feature, arrival and flush
    // alike. With it off the sweep is never even registered.
    this.enabled = configService.get('notifications.messaging.enabled', {
      infer: true,
    });
  }

  onModuleInit(): void {
    if (!this.enabled) {
      return;
    }
    if (!this.schedulerRegistry) {
      // Expected on the auth-reset worker, which has no ScheduleModule.
      // Logged rather than silent: on the API process this line appearing
      // means scheduling was lost and no digest will ever be flushed.
      this.logger.warn?.(
        'Messaging digest sweep not registered - no SchedulerRegistry in this module graph. Expected on the auth-reset worker; on the API process this means ScheduleModule.forRoot() is missing and digests will never flush.',
        LogContext.NOTIFICATIONS
      );
      return;
    }
    const intervalMs =
      this.digestSchedulerService.config.sweepIntervalSeconds * 1000;
    const interval = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.schedulerRegistry.addInterval(SWEEP_INTERVAL_NAME, interval);
  }

  onModuleDestroy(): void {
    if (!this.enabled || !this.schedulerRegistry) {
      return;
    }
    if (this.schedulerRegistry.doesExist('interval', SWEEP_INTERVAL_NAME)) {
      this.schedulerRegistry.deleteInterval(SWEEP_INTERVAL_NAME);
    }
  }

  /**
   * One sweep tick. Wrapped end-to-end in try/catch: a tick that throws must
   * not kill the scheduler, and there is no supervisor that would restart it.
   *
   * Re-entrancy guard: if a tick is still running when the next fires (a slow
   * batch, a slow adapter), the new one is skipped rather than piling up
   * overlapping flushes. Skipping is safe — the due entries are still there.
   */
  async tick(): Promise<void> {
    if (this.sweeping) {
      return;
    }
    this.sweeping = true;
    try {
      const claimed = await this.digestSchedulerService.claimDue(
        Date.now(),
        SWEEP_BATCH_SIZE
      );
      if (claimed.length === 0) {
        return;
      }
      for (let i = 0; i < claimed.length; i += SWEEP_CONCURRENCY) {
        const batch = claimed.slice(i, i + SWEEP_CONCURRENCY);
        // `flush` never throws — it logs and returns — so one bad track
        // cannot abort the rest of the batch.
        await Promise.all(
          batch.map(trackKey => this.digestFlushService.flush(trackKey))
        );
      }
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Messaging digest sweep tick failed',
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
    } finally {
      this.sweeping = false;
    }
  }
}
