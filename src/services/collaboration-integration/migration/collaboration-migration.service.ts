import { CollaborationContentType, LogContext } from '@common/enums';
import { decompressText } from '@common/utils/compression.util';
import { markdownToYjsV2State } from '@domain/common/memo/conversion';
import { Memo } from '@domain/common/memo/memo.entity';
import { whiteboardSceneToYjsV2State } from '@domain/common/whiteboard/conversion';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IsNull, Repository } from 'typeorm';
import { LegacyContentRecord } from './legacy.content.record';

const DEFAULT_BATCH_SIZE = 200;

/**
 * Outcome of one `migrateAll` run (US6/FR-007). Counters let an operator confirm
 * a clean migration: every reached legacy document either got a snapshot pointer,
 * was flagged (un-decodable, surfaced for review — NEVER silently dropped), or
 * failed (re-runnable). NULL-only at source means every reached record migrates.
 */
export interface MigrationSummary {
  total: number;
  migrated: number;
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
 * Outcome of one `verifyAll` run — the Release B pre-flight (operator preflight,
 * READ-ONLY). `ok` is true only when every memo/whiteboard row carries a
 * `contentPointer` (zero NULL) AND every pointer resolves in file-service.
 */
export interface VerificationSummary {
  memoNullPointers: number;
  whiteboardNullPointers: number;
  nullPointerTotal: number;
  pointersChecked: number;
  /** Rows whose non-null pointer does NOT resolve in file-service. */
  unresolved: {
    id: string;
    contentType: CollaborationContentType;
    contentPointer: string;
  }[];
  ok: boolean;
}

/**
 * Dedicated one-pass read path for the one-time legacy-content migration
 * (FR-009 / US4 / DEC-6). Iterates every NOT-YET-MIGRATED Memo (Yjs V2 `bytea`) and Whiteboard
 * (Excalidraw JSON `text`, gzip-compressed) row — those with `contentPointer IS
 * NULL`, selected + joined to their storage bucket at source — and yields
 * `{ id, contentType, content, storageBucketId }` — keyed by id, iterable
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
   * - Idempotent + resumable at SOURCE: the reader selects only rows whose
   *   `contentPointer IS NULL`, so a re-run after an interruption processes only
   *   the remainder; a failed upload leaves the row NULL and is retried on re-run.
   * - Empty content → seeded with the canonical empty snapshot,
   *   so every back-filled row gets a resolving pointer (Release B enforces NOT
   *   NULL). The room still materializes empty + editable (FR-010).
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
        await this.migrateRecord(record, dryRun);
        summary.migrated++;
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
   * Release B pre-flight (US6/FR-007) — READ-ONLY: proves every memo/whiteboard
   * carries a `contentPointer` (zero NULL) and every pointer resolves in
   * file-service. `ok` gates the destructive Release B migration. No writes — a
   * plain count + batched file-service reads, not a scheduler/state machine.
   */
  public async verifyAll(
    batchSize = DEFAULT_BATCH_SIZE
  ): Promise<VerificationSummary> {
    const [memoNullPointers, whiteboardNullPointers] = await Promise.all([
      this.memoRepository.count({ where: { contentPointer: IsNull() } }),
      this.whiteboardRepository.count({ where: { contentPointer: IsNull() } }),
    ]);
    const unresolved: VerificationSummary['unresolved'] = [];
    const memoChecked = await this.verifyPointers(
      this.memoRepository as Repository<Memo | Whiteboard>,
      CollaborationContentType.MEMO,
      batchSize,
      unresolved
    );
    const whiteboardChecked = await this.verifyPointers(
      this.whiteboardRepository as Repository<Memo | Whiteboard>,
      CollaborationContentType.WHITEBOARD,
      batchSize,
      unresolved
    );
    const nullPointerTotal = memoNullPointers + whiteboardNullPointers;
    return {
      memoNullPointers,
      whiteboardNullPointers,
      nullPointerTotal,
      pointersChecked: memoChecked + whiteboardChecked,
      unresolved,
      ok: nullPointerTotal === 0 && unresolved.length === 0,
    };
  }

  /**
   * Keyset-paginate the non-null pointers of one repository and resolve each
   * batch against file-service (`getContentBatch` echoes results positionally —
   * duplicates honoured — so match by index). Appends any that do not resolve to
   * `unresolved`; returns the count checked.
   */
  private async verifyPointers(
    repository: Repository<Memo | Whiteboard>,
    contentType: CollaborationContentType,
    batchSize: number,
    unresolved: VerificationSummary['unresolved']
  ): Promise<number> {
    let lastId: string | undefined;
    let checked = 0;
    for (;;) {
      const qb = repository
        .createQueryBuilder('doc')
        .select('doc.id', 'id')
        .addSelect('doc.contentPointer', 'contentPointer')
        .where('doc.contentPointer IS NOT NULL')
        .orderBy('doc.id', 'ASC')
        .limit(batchSize);
      if (lastId !== undefined) {
        qb.andWhere('doc.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<{
        id: string;
        contentPointer: string;
      }>();
      if (rows.length === 0) {
        break;
      }
      // Resolve ONE pointer per file-service call and discard each response before
      // the next. `getContentBatch` is a CONTENT endpoint (it reads + base64-
      // encodes the full blob), so peak memory is a single snapshot regardless of
      // the DB page size — never the whole page as one multi-hundred-MiB request.
      for (const row of rows) {
        checked++;
        const [result] = await this.fileServiceAdapter.getContentBatch([
          row.contentPointer,
        ]);
        if (!result?.found) {
          unresolved.push({
            id: row.id,
            contentType,
            contentPointer: row.contentPointer,
          });
        }
      }
      lastId = rows[rows.length - 1].id;
      if (rows.length < batchSize) {
        break;
      }
    }
    return checked;
  }

  /**
   * Migrates one NULL-pointer legacy record (the reader selects `contentPointer
   * IS NULL` at source and joins the storage bucket, so there is NO per-document
   * metadata SELECT here): encodes the content (empty → canonical empty snapshot),
   * uploads it to the record's OWN storage bucket, and sets the pointer ONLY after
   * a successful upload (a failure throws → the row stays NULL / rerunnable). A
   * record with no storage bucket fails from the record. Operator-exclusive — no
   * leases / concurrency machinery. Every reached record migrates (idempotency /
   * resumability come from the source NULL filter, not a per-row skip).
   */
  private async migrateRecord(
    record: LegacyContentRecord,
    dryRun: boolean
  ): Promise<void> {
    if (!record.storageBucketId) {
      throw new Error(
        `Document ${record.id} has no storage bucket; cannot write snapshot`
      );
    }

    if (dryRun) {
      return;
    }

    const isMemo = record.contentType === CollaborationContentType.MEMO;
    const repository = (
      isMemo ? this.memoRepository : this.whiteboardRepository
    ) as Repository<Memo | Whiteboard>;

    // EVERY reached (null-pointer) record is seeded, including empty content
    // (encodeSnapshot returns the canonical empty Y.Doc), so no row is left null.
    const snapshot = this.encodeSnapshot(record);
    const result = await this.fileServiceAdapter.createSnapshotInBucket(
      snapshot,
      record.storageBucketId
    );
    // First-writer-wins CAS: the live collab-service save path can assign a NEWER
    // pointer while this upload is in flight (Release A has NOT retired that path),
    // so an `id`-only UPDATE could clobber a newer pointer with the stale legacy
    // snapshot — a content regression that Release B's column drop would make
    // permanent. The `contentPointer IS NULL` guard makes the write a no-op if a
    // concurrent writer already won: `affected === 0` is reported as a failure
    // (re-runnable), never a success. The just-created snapshot is NOT deleted — it
    // may be content-deduped/shared with that writer, and an orphan snapshot is
    // harmless where overwriting is not.
    const updateResult = await repository
      .createQueryBuilder()
      .update()
      .set({
        contentPointer: result.id,
        contentVersion: 0,
      })
      .where('id = :id AND "contentPointer" IS NULL', { id: record.id })
      .execute();
    if (updateResult.affected !== 1) {
      throw new Error(
        `Document ${record.id} pointer was set by a concurrent writer during migration; refusing to overwrite (affected=${updateResult.affected})`
      );
    }
  }

  /**
   * Encodes a legacy record's content into a Yjs-V2 snapshot. Memo content is
   * already a v2 state (base64 of the inline bytes) — decoded straight through.
   * Whiteboard content is Excalidraw JSON converted via the binding-compatible
   * encoder. Release A back-fills EVERY selected row: empty content (never-edited
   * memo / empty whiteboard) is encoded as the canonical empty Y.Doc so the
   * back-fill still assigns a resolving pointer — never a NULL/skip (Release B
   * enforces NOT NULL). Same canonical empty encodings the create path seeds.
   */
  private encodeSnapshot(record: LegacyContentRecord): Buffer {
    if (record.contentType === CollaborationContentType.MEMO) {
      return record.content
        ? Buffer.from(record.content, 'base64')
        : Buffer.from(markdownToYjsV2State(''));
    }
    // Whiteboard: an empty/absent scene already encodes to the canonical empty
    // Y.Doc (`whiteboardSceneToYjsV2State` yields an empty doc, never throws).
    return Buffer.from(whiteboardSceneToYjsV2State(record.content ?? ''));
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
      // NULL-only at source: select ONLY not-yet-migrated memos
      // (`contentPointer IS NULL`) and join the document's own storage bucket in
      // the SAME page query — so the back-fill needs no per-document metadata
      // SELECT. `memo.content` is the inline Yjs-V2 column RETAINED in Release A
      // (unmapped on the entity, migration-only) and dropped only in Release B;
      // this raw select intentionally does NOT go through the entity mapping.
      const qb = this.memoRepository
        .createQueryBuilder('memo')
        .leftJoin('memo.profile', 'profile')
        .leftJoin('profile.storageBucket', 'storageBucket')
        .select('memo.id', 'id')
        .addSelect('memo.content', 'content')
        .addSelect('storageBucket.id', 'storageBucketId')
        .where('memo.contentPointer IS NULL')
        .orderBy('memo.id', 'ASC')
        .limit(batchSize);
      if (lastId !== undefined) {
        qb.andWhere('memo.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<{
        id: string;
        content: Buffer | null;
        storageBucketId: string | null;
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
          storageBucketId: row.storageBucketId ?? undefined,
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
      // NULL-only at source (see readMemos): only not-yet-migrated whiteboards are
      // selected + decompressed, so an already-migrated whiteboard with stale/
      // corrupt RETAINED legacy content is never touched. `whiteboard.content` is
      // the inline column RETAINED in Release A (unmapped on the entity,
      // migration-only) and dropped only in Release B. Read the RAW (compressed)
      // content via the query builder so the corrupt-blob case is flagged per-row
      // rather than aborting the batch; the storage bucket is joined here.
      const qb = this.whiteboardRepository
        .createQueryBuilder('whiteboard')
        .leftJoin('whiteboard.profile', 'profile')
        .leftJoin('profile.storageBucket', 'storageBucket')
        .select('whiteboard.id', 'id')
        .addSelect('whiteboard.content', 'content')
        .addSelect('storageBucket.id', 'storageBucketId')
        .where('whiteboard.contentPointer IS NULL')
        .orderBy('whiteboard.id', 'ASC')
        .limit(batchSize);
      if (lastId !== undefined) {
        qb.andWhere('whiteboard.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<{
        id: string;
        content: string | null;
        storageBucketId: string | null;
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
    storageBucketId: string | null;
  }): Promise<LegacyContentRecord> {
    const base: LegacyContentRecord = {
      id: row.id,
      contentType: CollaborationContentType.WHITEBOARD,
      storageBucketId: row.storageBucketId ?? undefined,
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
