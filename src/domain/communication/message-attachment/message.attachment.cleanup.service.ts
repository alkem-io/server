import { LogContext } from '@common/enums';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { Document } from '@domain/storage/document/document.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LessThan, Repository } from 'typeorm';

const STAGING_TTL_MS = 24 * 60 * 60 * 1000; // 24h (FR-012, SC-007)

/**
 * Scheduled cleanup for conversation media (feature 013, T014).
 *
 * Sweeps, once a day:
 *  - `matrix_media` staging documents older than 24h — media uploaded to Synapse
 *    but never referenced in a message (re-homed media is MOVED out of staging,
 *    so only un-homed residue remains here).
 *  - unsent `temporaryLocation` conversation-bucket uploads older than 24h —
 *    web composer uploads that were never sent.
 *
 * Reads the (read-only) `file` table via TypeORM and releases stale rows through
 * `FileServiceAdapter.deleteDocument` (never direct TypeORM writes). Disabled
 * unless the feature flag is on. If the platform runs an equivalent file-service
 * CronJob, that is authoritative and this can be left off (see plan / infra).
 */
@Injectable()
export class MessageAttachmentCleanupService {
  private readonly enabled: boolean;
  private readonly matrixMediaBucketId: string;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly fileServiceAdapter: FileServiceAdapter,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.enabled = this.configService.get(
      'communications.message_attachments.enabled',
      { infer: true }
    );
    this.matrixMediaBucketId = this.configService.get(
      'storage.file_service.matrix_media_bucket_id',
      { infer: true }
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sweepStagingDocuments(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    const cutoff = new Date(Date.now() - STAGING_TTL_MS);

    const released = await this.releaseUnhomedStagingDocuments(cutoff);
    const reaped = await this.releaseUnsentConversationUploads(cutoff);

    if (released + reaped > 0) {
      this.logger.verbose?.(
        `Conversation media cleanup: released ${released} staging + ${reaped} unsent uploads`,
        LogContext.COMMUNICATION
      );
    }
  }

  private async releaseUnhomedStagingDocuments(cutoff: Date): Promise<number> {
    const stale = await this.documentRepository.find({
      where: {
        storageBucket: { id: this.matrixMediaBucketId },
        createdDate: LessThan(cutoff),
      },
      relations: { storageBucket: true },
      select: { id: true },
    });
    return this.releaseAll(stale.map(d => d.id));
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
        await this.fileServiceAdapter.deleteDocument(id);
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
