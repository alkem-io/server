import { LogContext } from '@common/enums';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { Document } from '@domain/storage/document/document.entity';
import { DocumentService } from '@domain/storage/document/document.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LessThan, Repository } from 'typeorm';

const STAGING_TTL_MS = 24 * 60 * 60 * 1000; // 24h (FR-012, SC-007)

/** Cross-replica claim key for one daily sweep run. */
const SWEEP_CLAIM_KEY = 'msg:attachment:cleanup:claim';

/**
 * How long a claimed run stays claimed. Must comfortably exceed the spread of
 * a midnight `@Cron` firing across replicas (clock skew, staggered pod starts)
 * and comfortably precede the NEXT midnight, so a run is claimed exactly once
 * per day and a crashed claimant cannot block the following day.
 */
const SWEEP_CLAIM_TTL_SECONDS = 12 * 60 * 60; // 12h

/**
 * Scheduled cleanup for conversation media (feature 013, T014).
 *
 * Sweeps, once a day, ONLY:
 *  - unsent `temporaryLocation` conversation-bucket uploads older than 24h —
 *    server-created web-composer uploads that were never sent (compose
 *    abandoned).
 *
 * SCOPE — CONVERSATION buckets only, BY DESIGN. Feature 013 owns the
 * CONVERSATION buckets it created, so it is authoritative to age-sweep abandoned
 * temporary uploads there. Comment-room (callout/post) outbound attachments
 * re-home into the parent's PRE-EXISTING COLLABORATION bucket, whose abandoned
 * temporary-upload lifecycle is a broader, pre-existing PLATFORM concern (no
 * age-sweep exists there for ANY producer, not just 013). 013 deliberately does
 * NOT extend this sweep into collaboration buckets: from a bucket row alone it
 * could not distinguish an abandoned message attachment from a legitimate
 * in-progress content upload, so an age sweep there would risk reaping live
 * uploads. Nor does 013 restrict the send codepath (e.g. a conversation-only
 * outbound guard) to sidestep that gap — the codepath stays general; the
 * collaboration-bucket lifecycle is simply out of this feature's scope.
 *
 * `temporaryLocation=true` is a PROXY for "never sent" — a SENT attachment can
 * transiently still be temporary if the post-send flip failed. That proxy is
 * made safe by three pin anchors that flip a delivered attachment durable
 * (full-gate [0]): (1) the inline post-send flip
 * (`persistOutboundAttachments`, fast path), (2) the echo-anchored pin on the
 * message's own delivery echo (`coalesceOutboundEcho`, retried MQ channel),
 * and (3) the outbound read-heal on any read of the message
 * (`resolveAttachmentDocument`). The residual loss window therefore requires
 * ALL THREE to fail AND the conversation to go completely unread for 24h — a
 * compound fault, accepted and documented here.
 *
 * It deliberately does NOT reap `matrix_media` staging rows by age (H2). Those
 * rows back the Synapse media-storage provider's durable, byte-exact copies
 * (comment-room media before/without re-home, genuine Element orphans). The
 * provider's global by-reference(media_id) lookup must keep returning the
 * staging row for read-back, so reaping them by age would cause data loss and
 * break Synapse reads. Provider-staging GC is the file-service/provider's
 * responsibility, keyed on real un-referenced blobs — not a server age sweep.
 *
 * Reads the (read-only) `file` table via TypeORM and releases stale rows through
 * the canonical `DocumentService.deleteDocument` (FIX 5) — which delegates the
 * `file` delete to file-service AND cleans up the server-owned auth-policy +
 * tagset rows from the DeleteDocumentResult (never direct TypeORM writes).
 * If the platform runs an equivalent file-service CronJob, that one is
 * authoritative (see plan / infra) — the two sweeps are idempotent against each
 * other, since a row already released simply no longer matches the query.
 *
 * CROSS-REPLICA CLAIM — mirrors ConversationDigestSweepService (034,
 * FR-021/D-25): EVERY replica runs the schedule, and the run is claimed by a
 * single ATOMIC Redis write (the replica whose `SET NX` returns OK owns it), so
 * there is no leader election and no distributed lock. Without it every API pod
 * reaps the SAME document set concurrently and the losers log
 * EntityNotFoundException/404 at ERROR — a false-alarm burst proportional to
 * (replicas - 1) x stale rows. `SET NX EX` rather than the digest sweep's
 * `ZREM` only because the unit of work here is DERIVED by a query rather than
 * enqueued into a due ZSET; the claim principle is identical.
 *
 * The claim fails CLOSED (an unreachable Redis skips the run, logged), matching
 * `ConversationDigestSchedulerService.claimDue`. A skipped daily sweep is
 * harmless: the rows stay stale and the next run takes them.
 */
@Injectable()
export class MessageAttachmentCleanupService {
  constructor(
    private readonly documentService: DocumentService,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject(MESSAGING_REDIS_CLIENT)
    private readonly redis: Redis,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sweepStagingDocuments(): Promise<void> {
    if (!(await this.claimRun())) {
      return;
    }
    const cutoff = new Date(Date.now() - STAGING_TTL_MS);

    const reaped = await this.releaseUnsentConversationUploads(cutoff);

    if (reaped > 0) {
      this.logger.verbose?.(
        `Conversation media cleanup: released ${reaped} unsent uploads`,
        LogContext.COMMUNICATION
      );
    }
  }

  /**
   * Atomically claim this run for exactly one replica. `SET NX` returning `OK`
   * IS the claim — the replicas that get `null` simply skip, so there is no
   * leader election and no lock to release. Fails CLOSED: a Redis error skips
   * the run (logged) rather than letting every replica reap the same set.
   */
  private async claimRun(): Promise<boolean> {
    try {
      const claimed = await this.redis.set(
        SWEEP_CLAIM_KEY,
        Date.now().toString(),
        'EX',
        SWEEP_CLAIM_TTL_SECONDS,
        'NX'
      );
      return claimed === 'OK';
    } catch (error) {
      this.logger.warn?.(
        {
          message:
            'Conversation media cleanup: could not claim the sweep run; skipping it on this replica',
          error: (error as Error)?.message,
        },
        LogContext.COMMUNICATION
      );
      return false;
    }
  }

  private async releaseUnsentConversationUploads(
    cutoff: Date
  ): Promise<number> {
    const stale = await this.documentRepository.find({
      where: {
        temporaryLocation: true,
        createdDate: LessThan(cutoff),
        storageBucket: {
          storageAggregator: { type: StorageAggregatorType.CONVERSATION },
        },
      },
      relations: { storageBucket: { storageAggregator: true } },
      select: { id: true },
    });
    return this.releaseAll(stale.map(d => d.id));
  }

  private async releaseAll(documentIds: string[]): Promise<number> {
    let count = 0;
    for (const id of documentIds) {
      try {
        // FIX 5: canonical delete path — cleans up the auth-policy + tagset rows
        // owned by the server, which a direct fileServiceAdapter.deleteDocument
        // would leak.
        await this.documentService.deleteDocument({ ID: id });
        count++;
      } catch (error) {
        this.logger.error?.(
          {
            message: 'Failed to release stale conversation media',
            documentId: id,
          },
          (error as Error)?.stack,
          LogContext.COMMUNICATION
        );
      }
    }
    return count;
  }
}
