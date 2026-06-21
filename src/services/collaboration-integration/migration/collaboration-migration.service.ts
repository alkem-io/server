import { CollaborationContentType, LogContext } from '@common/enums';
import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { decompressText } from '@common/utils/compression.util';
import { Memo } from '@domain/common/memo/memo.entity';
import { whiteboardSceneToYjsV2State } from '@domain/common/whiteboard/conversion';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { LegacyContentRecord } from './legacy.content.record';

const DEFAULT_BATCH_SIZE = 200;

/**
 * Outcome of one `migrateAll` run (US6/FR-007). Counters let an operator confirm
 * a clean migration: every legacy document either got a snapshot pointer or was
 * skipped (already migrated / empty) or flagged (un-decodable, surfaced for
 * review — NEVER silently dropped).
 */
export interface MigrationSummary {
  total: number;
  migrated: number;
  /** Already had a `contentPointer` (idempotent re-run) or had no content. */
  skipped: number;
  /** Un-decodable legacy content surfaced for manual review (not migrated). */
  flagged: number;
  /** A snapshot write / pointer update failed for these (re-runnable). */
  failed: number;
  /** The flagged document ids + reasons, for operator follow-up. */
  flaggedDocuments: { id: string; reason: string }[];
  /** True when no snapshot was written / pointer mutated (preview only). */
  dryRun: boolean;
}

/** `migrateAll` options. */
export interface MigrationOptions {
  /** When true, compute the plan + counters but write nothing (preview). */
  dryRun?: boolean;
  batchSize?: number;
}

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
    private readonly whiteboardRepository: Repository<Whiteboard>,
    private readonly fileServiceAdapter: FileServiceAdapter
  ) {}

  /**
   * Runnable, idempotent, resumable up-front batch migration (US6/DEC-6/FR-007):
   * streams every legacy memo + whiteboard, encodes each document's content to a
   * Yjs-V2 snapshot (memo: the inline bytes are already a v2 state; whiteboard:
   * the Excalidraw JSON converted via the binding-compatible
   * `whiteboardSceneToYjsV2State`), writes it into the document's OWN storage
   * bucket (NULL authz), and records the `contentPointer`. Runs BEFORE the column
   * drop.
   *
   * - Idempotent + resumable: a document that already has a `contentPointer` is
   *   skipped, so a re-run after an interruption only processes the remainder.
   * - Empty content → skipped (the room materializes empty; FR-010).
   * - Un-decodable content → flagged + surfaced in the summary, NEVER dropped.
   * - `dryRun` computes the plan + counters but writes nothing.
   */
  public async migrateAll(
    options: MigrationOptions = {}
  ): Promise<MigrationSummary> {
    const { dryRun = false, batchSize = DEFAULT_BATCH_SIZE } = options;
    const summary: MigrationSummary = {
      total: 0,
      migrated: 0,
      skipped: 0,
      flagged: 0,
      failed: 0,
      flaggedDocuments: [],
      dryRun,
    };

    for await (const record of this.readAll(batchSize)) {
      summary.total++;

      if (record.flagged) {
        summary.flagged++;
        summary.flaggedDocuments.push({
          id: record.id,
          reason: record.flagReason ?? 'undecodable',
        });
        continue;
      }

      try {
        const outcome = await this.migrateRecord(record, dryRun);
        summary[outcome]++;
      } catch (error) {
        summary.failed++;
        this.logger.error?.(
          {
            message: 'Collaboration migration: failed to migrate document',
            id: record.id,
            contentType: record.contentType,
            error: String(error),
          },
          error instanceof Error ? error.stack : undefined,
          LogContext.COLLABORATION_INTEGRATION
        );
      }
    }

    this.logger.verbose?.(
      {
        message: 'Collaboration migration complete',
        ...summary,
        flaggedDocuments: undefined,
      },
      LogContext.COLLABORATION_INTEGRATION
    );
    return summary;
  }

  /**
   * Migrates one legacy record: skips an empty doc or one already pointing at a
   * snapshot (idempotent); otherwise encodes → uploads to the doc's bucket → sets
   * the pointer. Returns the summary counter to increment.
   */
  private async migrateRecord(
    record: LegacyContentRecord,
    dryRun: boolean
  ): Promise<'migrated' | 'skipped'> {
    const isMemo = record.contentType === CollaborationContentType.MEMO;
    const repository = (
      isMemo ? this.memoRepository : this.whiteboardRepository
    ) as Repository<Memo | Whiteboard>;

    // Resolve the document's current pointer + own bucket id. Already-pointed
    // documents are skipped (idempotent / resumable).
    const meta = await repository
      .createQueryBuilder('doc')
      .leftJoin('doc.profile', 'profile')
      .leftJoin('profile.storageBucket', 'storageBucket')
      .select('doc.id', 'id')
      .addSelect('doc.contentPointer', 'contentPointer')
      .addSelect('storageBucket.id', 'storageBucketId')
      .where('doc.id = :id', { id: record.id })
      .getRawOne<{
        id: string;
        contentPointer: string | null;
        storageBucketId: string | null;
      }>();

    if (!meta || meta.contentPointer) {
      return 'skipped';
    }

    const snapshot = this.encodeSnapshot(record);
    if (!snapshot) {
      // Empty content (never-edited memo / empty whiteboard): nothing to seed.
      return 'skipped';
    }

    if (!meta.storageBucketId) {
      throw new Error(
        `Document ${record.id} has no storage bucket; cannot write snapshot`
      );
    }

    if (dryRun) {
      return 'migrated';
    }

    const result = await this.fileServiceAdapter.createSnapshotInBucket(
      snapshot,
      meta.storageBucketId
    );
    await repository
      .createQueryBuilder()
      .update()
      .set({
        contentPointer: result.id,
        blobStore: BlobStoreKind.FILE_SERVICE,
        contentVersion: 0,
      })
      .where('id = :id', { id: record.id })
      .execute();
    return 'migrated';
  }

  /**
   * Encodes a legacy record's content into a Yjs-V2 snapshot. Memo content is
   * already a v2 state (base64 of the inline bytes) — decoded straight through.
   * Whiteboard content is Excalidraw JSON converted via the binding-compatible
   * encoder. Returns `undefined` for empty content (nothing to write).
   */
  private encodeSnapshot(record: LegacyContentRecord): Buffer | undefined {
    if (record.contentType === CollaborationContentType.MEMO) {
      if (!record.content) {
        return undefined;
      }
      return Buffer.from(record.content, 'base64');
    }
    // Whiteboard: empty / absent scene → nothing to seed.
    if (!record.content || record.content === '') {
      return undefined;
    }
    return Buffer.from(whiteboardSceneToYjsV2State(record.content));
  }

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
    // Keyset pagination over the immutable `id` PK rather than offset
    // (`skip`/`take`): the latter can skip or duplicate rows if concurrent
    // inserts/deletes shift offsets mid-run, which would violate the one-pass,
    // no-drop migration guarantee (plan.md §Migration; spec Edge Cases).
    let lastId: string | undefined;
    for (;;) {
      // Raw column read (bypasses entity hooks) — memo has no @AfterLoad, but
      // we read only the columns the migration needs.
      const qb = this.memoRepository
        .createQueryBuilder('memo')
        .select('memo.id', 'id')
        .addSelect('memo.content', 'content')
        .addSelect('memo.authorizationId', 'authorizationPolicyId')
        .orderBy('memo.id', 'ASC')
        .limit(batchSize);
      if (lastId !== undefined) {
        qb.where('memo.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<{
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

      lastId = rows[rows.length - 1].id;
      if (rows.length < batchSize) {
        break;
      }
    }
  }

  public async *readWhiteboards(
    batchSize = DEFAULT_BATCH_SIZE
  ): AsyncGenerator<LegacyContentRecord> {
    // Keyset pagination over the immutable `id` PK (see `readMemos`) — offset
    // pagination is unsafe under concurrent inserts/deletes during the run.
    let lastId: string | undefined;
    for (;;) {
      // Read the RAW (compressed) content via the query builder so the entity
      // `@AfterLoad` decompression hook does NOT throw on a corrupt blob and
      // abort the whole batch — we decompress per-row and flag failures.
      const qb = this.whiteboardRepository
        .createQueryBuilder('whiteboard')
        .select('whiteboard.id', 'id')
        .addSelect('whiteboard.content', 'content')
        .addSelect('whiteboard.authorizationId', 'authorizationPolicyId')
        .orderBy('whiteboard.id', 'ASC')
        .limit(batchSize);
      if (lastId !== undefined) {
        qb.where('whiteboard.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<{
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

      lastId = rows[rows.length - 1].id;
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
