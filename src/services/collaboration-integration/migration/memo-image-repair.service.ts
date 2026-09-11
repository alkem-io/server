import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Memo } from '@domain/common/memo/memo.entity';
import { DocumentService } from '@domain/storage/document/document.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { FileServiceAdapterException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import { CollaborationDocumentService } from '@services/collaboration-client/collaboration-document.service';
import { isUUID } from 'class-validator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import {
  collectMemoImageSources,
  removeMemoImagesBySource,
} from './memo-image-repair';

const DEFAULT_REPAIR_BATCH_SIZE = 200;

export type MissingMemoImageReason = 'metadata-missing' | 'content-missing';

export interface MissingMemoImageReference {
  source: string;
  documentId: string;
  occurrences: number;
  reason: MissingMemoImageReason;
}

export interface MemoImageRepairDocument {
  id: string;
  references: MissingMemoImageReference[];
  removedReferences: number;
}

export interface MemoImageRepairSummary {
  total: number;
  affected: number;
  repaired: number;
  proposedRemovals: number;
  removedReferences: number;
  failed: number;
  affectedDocuments: MemoImageRepairDocument[];
  failedDocuments: { id: string; reason: string }[];
  dryRun: boolean;
}

export interface MemoImageRepairOptions {
  actorId: string;
  apply?: boolean;
  batchSize?: number;
  memoIds?: string[];
}

interface MemoRepairCandidate {
  id: string;
  storageBucketId: string | null;
}

type ImageContentState =
  | { missing: false }
  | { missing: true; reason: MissingMemoImageReason };

const repairErrorReason = (error: unknown): string => {
  if (error instanceof FileServiceAdapterException) {
    const outcome =
      error.httpStatus === undefined
        ? 'transport-failure'
        : `http-${error.httpStatus}`;
    return `file-service:${error.operation}:${outcome}`;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Unknown memo image repair error';
};

/**
 * Explicit operator repair inside the existing collaboration-migration runtime.
 * Discovery is read-only by default. Apply mode mutates only the live memo room,
 * so the collaboration service remains the snapshot owner and concurrent edits
 * are never replaced by a stale file-service snapshot.
 */
@Injectable()
export class MemoImageRepairService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(Memo)
    private readonly memoRepository: Repository<Memo>,
    private readonly documentService: DocumentService,
    private readonly fileServiceAdapter: FileServiceAdapter,
    private readonly collaborationDocumentService: CollaborationDocumentService
  ) {}

  async repairMemoImages(
    options: MemoImageRepairOptions
  ): Promise<MemoImageRepairSummary> {
    const dryRun = options.apply !== true;
    const summary: MemoImageRepairSummary = {
      total: 0,
      affected: 0,
      repaired: 0,
      proposedRemovals: 0,
      removedReferences: 0,
      failed: 0,
      affectedDocuments: [],
      failedDocuments: [],
      dryRun,
    };

    for await (const candidate of this.readCandidates(
      options.batchSize,
      options.memoIds
    )) {
      summary.total++;
      try {
        if (!candidate.storageBucketId) {
          throw new Error('Memo has no storage bucket');
        }
        const sourceCounts = await this.collaborationDocumentService.read(
          candidate.id,
          'memo',
          options.actorId,
          collectMemoImageSources
        );
        const references = await this.findMissingReferences(
          sourceCounts,
          candidate.storageBucketId
        );
        if (references.length === 0) {
          continue;
        }

        summary.affected++;
        summary.proposedRemovals += references.reduce(
          (total, reference) => total + reference.occurrences,
          0
        );
        const result: MemoImageRepairDocument = {
          id: candidate.id,
          references,
          removedReferences: 0,
        };
        summary.affectedDocuments.push(result);

        if (dryRun) {
          continue;
        }

        const missingSources = new Set(
          references.map(reference => reference.source)
        );
        let removedReferences = 0;
        await this.collaborationDocumentService.mutate(
          candidate.id,
          'memo',
          options.actorId,
          doc => {
            removedReferences = removeMemoImagesBySource(doc, missingSources);
          }
        );
        result.removedReferences = removedReferences;
        summary.removedReferences += result.removedReferences;
        if (result.removedReferences > 0) {
          summary.repaired++;
          this.logger.warn?.(
            {
              message:
                'Memo image repair removed confirmed-unrecoverable image references',
              memoId: candidate.id,
              removedReferences: result.removedReferences,
              references,
            },
            LogContext.COLLABORATION_INTEGRATION
          );
        }
      } catch (error) {
        summary.failed++;
        const reason = repairErrorReason(error);
        summary.failedDocuments.push({ id: candidate.id, reason });
        this.logger.error?.(
          {
            message:
              'Memo image repair did not complete; durability was not confirmed',
            memoId: candidate.id,
            error: reason,
          },
          error instanceof Error ? error.stack : undefined,
          LogContext.COLLABORATION_INTEGRATION
        );
      }
    }

    return summary;
  }

  private async findMissingReferences(
    sourceCounts: Map<string, number>,
    storageBucketId: string
  ): Promise<MissingMemoImageReference[]> {
    const missing: MissingMemoImageReference[] = [];
    const states = new Map<string, Promise<ImageContentState>>();
    for (const [source, occurrences] of sourceCounts) {
      if (!this.documentService.isAlkemioDocumentURL(source)) {
        continue;
      }
      const documentId = this.extractDocumentId(source);
      let pending = states.get(documentId);
      if (!pending) {
        pending = this.readImageContentState(documentId, storageBucketId);
        states.set(documentId, pending);
      }
      const state = await pending;
      if (state.missing) {
        missing.push({ source, documentId, occurrences, reason: state.reason });
      }
    }
    return missing;
  }

  private extractDocumentId(source: string): string {
    const prefix = `${this.documentService.getDocumentsBaseUrlPath().replace(/\/+$/, '')}/`;
    const documentId = source.startsWith(prefix)
      ? source.slice(prefix.length)
      : '';
    if (!isUUID(documentId)) {
      throw new Error('Memo contains a malformed internal image reference');
    }
    return documentId;
  }

  private async readImageContentState(
    documentId: string,
    storageBucketId: string
  ): Promise<ImageContentState> {
    let document;
    try {
      document = await this.documentService.getDocumentOrFail(documentId, {
        relations: { storageBucket: true },
      });
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        return { missing: true, reason: 'metadata-missing' };
      }
      throw error;
    }
    if (document.storageBucket?.id !== storageBucketId) {
      throw new Error('Memo image does not belong to the memo storage bucket');
    }

    let content: Buffer;
    try {
      content = await this.fileServiceAdapter.getDocumentContent(documentId);
    } catch (error) {
      if (
        error instanceof FileServiceAdapterException &&
        error.operation === 'getDocumentContent' &&
        error.httpStatus === 404
      ) {
        return { missing: true, reason: 'content-missing' };
      }
      throw error;
    }
    if (!Buffer.isBuffer(content) || content.length === 0) {
      throw new Error('Memo image lookup returned malformed or empty content');
    }
    return { missing: false };
  }

  private async *readCandidates(
    batchSize = DEFAULT_REPAIR_BATCH_SIZE,
    memoIds?: string[]
  ): AsyncGenerator<MemoRepairCandidate> {
    let lastId: string | undefined;
    for (;;) {
      const qb = this.memoRepository
        .createQueryBuilder('memo')
        .leftJoin('memo.profile', 'profile')
        .leftJoin('profile.storageBucket', 'storageBucket')
        .select('memo.id', 'id')
        .addSelect('storageBucket.id', 'storageBucketId')
        .where('memo.contentPointer IS NOT NULL')
        .orderBy('memo.id', 'ASC')
        .limit(batchSize);
      if (memoIds?.length) {
        qb.andWhere('memo.id IN (:...memoIds)', { memoIds });
      }
      if (lastId !== undefined) {
        qb.andWhere('memo.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<MemoRepairCandidate>();
      if (rows.length === 0) {
        return;
      }
      for (const row of rows) {
        yield row;
      }
      lastId = rows[rows.length - 1].id;
      if (rows.length < batchSize) {
        return;
      }
    }
  }
}
