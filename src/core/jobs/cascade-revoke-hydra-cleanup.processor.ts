import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceClientLifecycleAudit } from '@src/platform-admin/domain/service-clients/audit/service-client-lifecycle.audit';
import { HydraAdminClient } from '@src/platform-admin/domain/service-clients/hydra-admin.client';
import { AlkemioConfig } from '@src/types';
import { type ConnectionOptions, Job, Queue, Worker } from 'bullmq';

/**
 * 004 T035 — `cascade-revoke-hydra-cleanup` BullMQ processor (research.md
 * R-7, data-model.md §5).
 *
 * After a service-client owner's user account is deleted (or an admin
 * fires a manual revoke), the catalogue-side status flip is committed
 * synchronously inside the User-delete transaction (FR-004 split
 * semantics — Clarifications Session 2026-05-19). The Hydra-side
 * `DELETE /admin/clients/{clientId}` is best-effort and queued here:
 *   - queue: `alkemio:svc:hydra-cleanup` (matches Plan §Storage Redis
 *     keyspace)
 *   - attempts: 12
 *   - backoff: exponential 5 s → 10 s → 20 s → … capped by BullMQ at
 *     the 10 min ceiling research R-7 envelope describes
 *   - on success → emits FR-020 `cascade-revoke-hydra-cleanup` with
 *     `outcome: success`
 *   - on final exhaustion → emits the same event with
 *     `outcome: failed_terminal` so the FR-023a detail-view operator
 *     badge surfaces the orphan Hydra resource for hand-cleanup.
 *
 * The processor is idempotent: Hydra returns 404 on missing clients
 * (already deleted) which the worker treats as success.
 */

export const CASCADE_REVOKE_HYDRA_CLEANUP_QUEUE_NAME =
  'alkemio:svc:hydra-cleanup';
export const CASCADE_REVOKE_HYDRA_CLEANUP_JOB_NAME =
  'cascade-revoke-hydra-cleanup';
export const CASCADE_REVOKE_HYDRA_CLEANUP_MAX_ATTEMPTS = 12;
export const CASCADE_REVOKE_HYDRA_CLEANUP_BACKOFF_DELAY_MS = 5_000;

export interface CascadeRevokeHydraCleanupJobData {
  clientId: string;
  triggeredBy: 'owner_account_deleted' | 'admin_revoke';
  /** UUID linking back to the synchronous-revoke audit event. */
  triggeringAuditEventId?: string;
}

@Injectable()
export class CascadeRevokeHydraCleanupProcessor implements OnModuleDestroy {
  private readonly logger = new Logger(CascadeRevokeHydraCleanupProcessor.name);
  private readonly queue: Queue<CascadeRevokeHydraCleanupJobData>;
  private readonly worker: Worker<CascadeRevokeHydraCleanupJobData>;
  private readonly connection: ConnectionOptions;

  constructor(
    private readonly hydraAdminClient: HydraAdminClient,
    private readonly lifecycleAudit: ServiceClientLifecycleAudit,
    @Inject(ConfigService)
    configService: ConfigService<AlkemioConfig, true>
  ) {
    const { host, port } = configService.get('storage.redis', {
      infer: true,
    });
    this.connection = { host, port: Number(port) } as ConnectionOptions;

    this.queue = new Queue<CascadeRevokeHydraCleanupJobData>(
      CASCADE_REVOKE_HYDRA_CLEANUP_QUEUE_NAME,
      { connection: this.connection }
    );

    this.worker = new Worker<CascadeRevokeHydraCleanupJobData>(
      CASCADE_REVOKE_HYDRA_CLEANUP_QUEUE_NAME,
      job => this.process(job),
      { connection: this.connection }
    );

    this.worker.on('failed', (job, err) => {
      if (job === undefined) return;
      this.logger.warn(
        `cascade-revoke-hydra-cleanup attempt ${job.attemptsMade}/${CASCADE_REVOKE_HYDRA_CLEANUP_MAX_ATTEMPTS} ` +
          `failed for clientId=${job.data.clientId}: ${err.message}`
      );
      if (job.attemptsMade >= CASCADE_REVOKE_HYDRA_CLEANUP_MAX_ATTEMPTS) {
        this.lifecycleAudit.emitCascadeRevokeHydraCleanup({
          clientId: job.data.clientId,
          outcome: 'failed_terminal',
          attempts: job.attemptsMade,
          reason: job.data.triggeredBy,
        });
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.worker.close(), this.queue.close()]);
  }

  /**
   * Enqueues a cascade-revoke-hydra-cleanup job. Idempotent at the
   * queue layer — duplicate enqueues for the same clientId result in
   * multiple jobs but each is idempotent at the Hydra layer (404 ⇒
   * treat-as-success), so the catalogue-vs-Hydra invariant holds.
   */
  async enqueue(data: CascadeRevokeHydraCleanupJobData): Promise<void> {
    await this.queue.add(CASCADE_REVOKE_HYDRA_CLEANUP_JOB_NAME, data, {
      attempts: CASCADE_REVOKE_HYDRA_CLEANUP_MAX_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: CASCADE_REVOKE_HYDRA_CLEANUP_BACKOFF_DELAY_MS,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  /** Test-affordance — exposes the queue for spec-level introspection. */
  getQueue(): Queue<CascadeRevokeHydraCleanupJobData> {
    return this.queue;
  }

  private async process(
    job: Job<CascadeRevokeHydraCleanupJobData>
  ): Promise<void> {
    const { clientId, triggeredBy } = job.data;
    try {
      await this.hydraAdminClient.deleteOAuth2Client(clientId);
    } catch (err) {
      // Treat 404 as success — Hydra has no row for `clientId`, so the
      // catalogue ↔ Hydra invariant is already satisfied.
      if (isHydraNotFound(err)) {
        this.logger.log(
          `cascade-revoke-hydra-cleanup: Hydra row already absent for clientId=${clientId}`
        );
      } else {
        // Re-throw so BullMQ counts the attempt and applies the
        // exponential backoff per attempt configuration.
        throw err instanceof Error
          ? err
          : new Error(
              `cascade-revoke-hydra-cleanup failed for clientId=${clientId}: ${String(err)}`
            );
      }
    }

    this.lifecycleAudit.emitCascadeRevokeHydraCleanup({
      clientId,
      outcome: 'success',
      attempts: job.attemptsMade + 1,
      reason: triggeredBy,
    });
  }
}

/**
 * Hydra's `@ory/hydra-client` raises a `ResponseError`-shaped object
 * whose `.response.status` is the HTTP status code. We probe defensively
 * because the typings have drifted historically.
 */
function isHydraNotFound(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const e = err as { response?: { status?: unknown }; status?: unknown };
  if (typeof e.response?.status === 'number' && e.response.status === 404) {
    return true;
  }
  if (typeof e.status === 'number' && e.status === 404) return true;
  return false;
}
