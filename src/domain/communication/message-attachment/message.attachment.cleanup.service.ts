import { LogContext } from '@common/enums';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { Document } from '@domain/storage/document/document.entity';
import { DocumentService } from '@domain/storage/document/document.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LessThan, Repository } from 'typeorm';

const STAGING_TTL_MS = 24 * 60 * 60 * 1000; // 24h (FR-012, SC-007)

/**
 * Scheduled cleanup for conversation media (feature 013, T014).
 *
 * Sweeps, once a day, ONLY:
 *  - unsent `temporaryLocation` conversation-bucket uploads older than 24h —
 *    server-created web-composer uploads that were never sent (compose
 *    abandoned).
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
 * Disabled unless the feature flag is on. If the platform runs an equivalent
 * file-service CronJob, that is authoritative and this can be left off (see
 * plan / infra).
 */
@Injectable()
export class MessageAttachmentCleanupService {
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly documentService: DocumentService,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.enabled = this.configService.get(
      'communications.message_attachments.enabled',
      { infer: true }
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sweepStagingDocuments(): Promise<void> {
    if (!this.enabled) {
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
