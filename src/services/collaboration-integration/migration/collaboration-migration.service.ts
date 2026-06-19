import { CollaborationContentType, LogContext } from '@common/enums';
import { decompressText } from '@common/utils/compression.util';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { LegacyContentRecord } from './legacy.content.record';

const DEFAULT_BATCH_SIZE = 200;

/**
 * Dedicated one-pass read path for the one-time legacy-content migration
 * (FR-009 / US4 / DEC-6). Iterates every persisted Memo (Yjs v1/v2 `bytea`) and
 * Whiteboard (Excalidraw JSON `text`, gzip-compressed) row and yields
 * `{ id, contentType, content, authorizationPolicyId }` — keyed by id, iterable
 * in full, without gaps.
 *
 * Separate from the live `collaboration-fetch` (which is per-document +
 * error-shaped for the live path) so the one-time job can stream all rows and
 * the live contract stays clean.
 *
 * Edge cases (spec §Edge Cases):
 *  - memo with NULL content (never edited) -> `content: undefined` (the job
 *    seeds an empty Y.Doc; not a failure).
 *  - whiteboard decompression failure (corrupt legacy blob) -> the record is
 *    `flagged` for manual review, NOT silently dropped.
 */
@Injectable()
export class CollaborationMigrationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(Memo)
    private readonly memoRepository: Repository<Memo>,
    @InjectRepository(Whiteboard)
    private readonly whiteboardRepository: Repository<Whiteboard>
  ) {}

  /**
   * Streams every legacy memo + whiteboard record for the migration. Batched so
   * the whole table is never materialized in memory at once.
   */
  public async *readAll(
    batchSize = DEFAULT_BATCH_SIZE
  ): AsyncGenerator<LegacyContentRecord> {
    yield* this.readMemos(batchSize);
    yield* this.readWhiteboards(batchSize);
  }

  public async *readMemos(
    batchSize = DEFAULT_BATCH_SIZE
  ): AsyncGenerator<LegacyContentRecord> {
    let skip = 0;
    for (;;) {
      // Raw column read (bypasses entity hooks) — memo has no @AfterLoad, but
      // we read only the columns the migration needs.
      const rows = await this.memoRepository
        .createQueryBuilder('memo')
        .select('memo.id', 'id')
        .addSelect('memo.content', 'content')
        .addSelect('memo.authorizationId', 'authorizationPolicyId')
        .orderBy('memo.id', 'ASC')
        .skip(skip)
        .take(batchSize)
        .getRawMany<{
          id: string;
          content: Buffer | null;
          authorizationPolicyId: string | null;
        }>();

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        yield {
          id: row.id,
          contentType: CollaborationContentType.MEMO,
          content: row.content
            ? Buffer.from(row.content).toString('base64')
            : undefined,
          authorizationPolicyId: row.authorizationPolicyId ?? undefined,
        };
      }

      skip += rows.length;
      if (rows.length < batchSize) {
        break;
      }
    }
  }

  public async *readWhiteboards(
    batchSize = DEFAULT_BATCH_SIZE
  ): AsyncGenerator<LegacyContentRecord> {
    let skip = 0;
    for (;;) {
      // Read the RAW (compressed) content via the query builder so the entity
      // `@AfterLoad` decompression hook does NOT throw on a corrupt blob and
      // abort the whole batch — we decompress per-row and flag failures.
      const rows = await this.whiteboardRepository
        .createQueryBuilder('whiteboard')
        .select('whiteboard.id', 'id')
        .addSelect('whiteboard.content', 'content')
        .addSelect('whiteboard.authorizationId', 'authorizationPolicyId')
        .orderBy('whiteboard.id', 'ASC')
        .skip(skip)
        .take(batchSize)
        .getRawMany<{
          id: string;
          content: string | null;
          authorizationPolicyId: string | null;
        }>();

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        yield await this.toWhiteboardRecord(row);
      }

      skip += rows.length;
      if (rows.length < batchSize) {
        break;
      }
    }
  }

  private async toWhiteboardRecord(row: {
    id: string;
    content: string | null;
    authorizationPolicyId: string | null;
  }): Promise<LegacyContentRecord> {
    const base: LegacyContentRecord = {
      id: row.id,
      contentType: CollaborationContentType.WHITEBOARD,
      authorizationPolicyId: row.authorizationPolicyId ?? undefined,
    };

    if (!row.content || row.content === '') {
      return { ...base, content: '' };
    }

    try {
      return { ...base, content: await decompressText(row.content) };
    } catch (e: any) {
      this.logger.warn?.(
        { message: 'Migration: failed to decompress whiteboard', id: row.id },
        LogContext.COLLABORATION_INTEGRATION
      );
      return {
        ...base,
        flagged: true,
        flagReason: `decompression_failed: ${e?.message ?? 'unknown'}`,
      };
    }
  }
}
