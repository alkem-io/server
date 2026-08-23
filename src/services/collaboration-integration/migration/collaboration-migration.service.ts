import { CollaborationContentType, LogContext } from '@common/enums';
import { decompressText } from '@common/utils/compression.util';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { markdownToYjsV2State } from '@domain/common/memo/conversion';
import { Memo } from '@domain/common/memo/memo.entity';
import {
  type LegacyBinaryFileData,
  parseLegacyWhiteboardScene,
  whiteboardSceneToYjsV2State,
} from '@domain/common/whiteboard/conversion';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IsNull, Repository } from 'typeorm';
import { LegacyContentRecord } from './legacy.content.record';

const DEFAULT_BATCH_SIZE = 200;

/**
 * Decode a `data:` URI into its media type + raw bytes. Legacy `BinaryFileData` can
 * carry inline `dataURL` bytes — with no `url`, or ALONGSIDE a `url` whose file-service
 * row no longer resolves — which client-web deliberately preserves
 * (convertLocalFileToRemote keeps `dataURL` on the uploaded descriptor; Portal strips
 * it only for broadcast, not for stored single-user content) and pre-006 rendered from.
 * The one-time migration up-homes those bytes rather than drop a recoverable image.
 * Returns `undefined` for anything that is not a decodable `data:` URI.
 */
const parseDataUrl = (
  dataURL: string
): { mimeType: string; buffer: Buffer } | undefined => {
  const match = /^data:([^;,]*)((?:;[^,]*)*),(.*)$/s.exec(dataURL);
  if (!match) {
    return undefined;
  }
  const mimeType = match[1] || 'application/octet-stream';
  const params = match[2] ?? '';
  const data = match[3] ?? '';
  const isBase64 = /;base64/i.test(params);
  try {
    const buffer = isBase64
      ? Buffer.from(data, 'base64')
      : Buffer.from(decodeURIComponent(data), 'utf8');
    if (buffer.length === 0) {
      return undefined;
    }
    return { mimeType, buffer };
  } catch {
    return undefined;
  }
};

/** File extension for a media type, for a human-readable document display name. */
const extensionForMimeType = (mimeType: string): string => {
  const subtype = mimeType.split('/')[1]?.split('+')[0]?.trim();
  return subtype ? `.${subtype}` : '';
};

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
    private readonly fileServiceAdapter: FileServiceAdapter,
    private readonly documentService: DocumentService,
    private readonly storageBucketService: StorageBucketService,
    private readonly documentAuthorizationService: DocumentAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService
  ) {}

  /**
   * Runnable, idempotent, resumable up-front batch migration (US6/DEC-6/FR-007):
   * streams every legacy memo + whiteboard, encodes each document's content to a
   * Yjs-V2 snapshot (memo: the inline bytes are already a v2 state; whiteboard:
   * the legacy Excalidraw JSON converted via the fork-based
   * `whiteboardSceneToYjsV2State`, with embedded media resolved to file-service
   * locator strings), writes it into the document's OWN storage
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
    const snapshot = await this.encodeSnapshot(record);
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
   * Whiteboard content is legacy Excalidraw JSON converted via the fork-based
   * encoder (the same fork the editor + collaboration-service use), so the seeded
   * doc is STRUCTURALLY compatible with an editor-produced one (same element↔Y.Map
   * schema, root types and fractional-index scheme — the per-doc Yjs clientID
   * differs, which does not affect `ApplyUpdateV2` rehydration). Its embedded media —
   * legacy `BinaryFileData` objects carrying an Alkemio file-service `url` or inline
   * `dataURL` bytes — is resolved to opaque file-service locator STRINGS FIRST (the
   * unified schema), then written into the snapshot's `FILES` map; the legacy
   * `BinaryFileData` objects are never stored (that is exactly the pre-006 shape
   * `readAssetLocators` rejects loudly). Release A back-fills EVERY selected row: empty content
   * (never-edited memo / empty whiteboard) is encoded as the canonical empty Y.Doc
   * so the back-fill still assigns a resolving pointer — never a NULL/skip (Release
   * B enforces NOT NULL). Same canonical empty encodings the create path seeds.
   */
  private async encodeSnapshot(record: LegacyContentRecord): Promise<Buffer> {
    if (record.contentType === CollaborationContentType.MEMO) {
      return record.content
        ? Buffer.from(record.content, 'base64')
        : Buffer.from(markdownToYjsV2State(''));
    }
    // Whiteboard: resolve the legacy embedded-media references to opaque locator
    // strings (url-backed → its document id; dataURL-only → bytes up-homed into this
    // whiteboard's bucket), then encode via the fork. An empty/absent scene yields the
    // canonical empty fork doc (never throws).
    const sceneJSON = record.content ?? '';
    const assetLocators = await this.resolveWhiteboardAssetLocators(
      sceneJSON,
      record
    );
    return Buffer.from(
      await whiteboardSceneToYjsV2State(sceneJSON, assetLocators)
    );
  }

  /**
   * Resolves a legacy whiteboard scene's embedded-media map
   * (`fileId -> BinaryFileData`) to the unified `fileId -> file-service locator
   * string` map the fork writes into the snapshot's `FILES` `Y.Map`. Iterates the
   * scene's own `files`; each entry that resolves to a locator is kept. A genuinely
   * unrecoverable entry (malformed/undecodable, no usable url or bytes) is skipped +
   * surfaced (never a crash); a transient upload/read failure THROWS and fails the
   * record (re-runnable) rather than silently dropping media. Returns an empty map
   * for an empty/undecodable scene or one with no media.
   */
  private async resolveWhiteboardAssetLocators(
    sceneJSON: string,
    record: LegacyContentRecord
  ): Promise<Record<string, string>> {
    const files = parseLegacyWhiteboardScene(sceneJSON)?.files;
    if (!files) {
      return {};
    }
    const locators: Record<string, string> = {};
    for (const [fileId, file] of Object.entries(files)) {
      const locator = await this.resolveLegacyFileLocator(fileId, file, record);
      if (locator) {
        locators[fileId] = locator;
      }
    }
    return locators;
  }

  /**
   * Resolves one legacy `BinaryFileData` to the opaque file-service locator string
   * (the document id) the unified schema stores. A descriptor can carry BOTH a `url`
   * AND inline `dataURL` bytes (`convertLocalFileToRemote` keeps `dataURL` on the
   * uploaded descriptor; Portal strips it only for broadcast, not for stored
   * single-user content), so pre-006 fell back to the inline bytes whenever the url
   * did not resolve. Precedence mirrors that recoverability, restoring the same image
   * the reader saw — never a NEW loss:
   *  1. `url` resolves to a live Alkemio document → its document id.
   *  2. `url` is a valid Alkemio doc URL whose row is gone, BUT decodable `dataURL`
   *     bytes are present → up-home the bytes (pre-006 rendered them) — a recoverable
   *     image must not degrade into an unresolvable dead-doc locator.
   *  3. valid Alkemio doc URL, missing row, NO usable bytes → preserve the embedded
   *     (dangling) id, so the asset points where it did pre-006 (a later restore
   *     resolves it; no regression).
   *  4. no usable Alkemio url (external url, or none): up-home the `dataURL` bytes if
   *     present; otherwise (external-only, no bytes) skip + surface.
   */
  private async resolveLegacyFileLocator(
    fileId: string,
    file: LegacyBinaryFileData,
    record: LegacyContentRecord
  ): Promise<string | undefined> {
    const url = typeof file?.url === 'string' ? file.url.trim() : '';
    // 1–3. Alkemio file-service document URL.
    if (url && this.documentService.isAlkemioDocumentURL(url)) {
      const document = await this.documentService.getDocumentFromURL(url, {
        loadEagerRelations: false,
      });
      if (document) {
        return document.id; // 1. live row → its document id.
      }
      // 2. Row gone, but inline bytes are still there (recoverable) → up-home them.
      const uphomed = await this.uphomeDataUrlAsset(fileId, file, record);
      if (uphomed) {
        return uphomed;
      }
      // 3. No usable bytes → preserve the dangling id (no regression).
      const base = this.documentService.getDocumentsBaseUrlPath();
      const id = url.substring(base.length + 1);
      this.logger.warn?.(
        {
          message:
            'Migration: whiteboard asset url did not resolve to a live document and has no inline bytes; preserving the reference id',
          id: record.id,
          fileId,
        },
        LogContext.COLLABORATION_INTEGRATION
      );
      return id || undefined;
    }

    // 4. No usable Alkemio url → up-home inline bytes if present, else skip + surface.
    const uphomed = await this.uphomeDataUrlAsset(fileId, file, record);
    if (uphomed) {
      return uphomed;
    }
    this.logger.warn?.(
      {
        message:
          'Migration: whiteboard asset has no Alkemio url and no inline bytes; skipping asset',
        id: record.id,
        fileId,
      },
      LogContext.COLLABORATION_INTEGRATION
    );
    return undefined;
  }

  /**
   * Up-homes a legacy inline `dataURL` image into the whiteboard's OWN storage bucket
   * (the earliest owner) as a real, authorized file-service document, and returns its
   * id as the opaque locator string. `uploadFileAsDocumentFromBuffer` creates the row
   * with a BLANK document authorization; the ordinary upload boundary
   * (`StorageBucketResolverMutations.uploadFileOnStorageBucket`) immediately inherits the
   * bucket policy via `DocumentAuthorizationService.applyAuthorizationPolicy(document,
   * bucket.authorization)` + `AuthorizationPolicyService.saveAll(...)`, so the migration
   * MUST do the same through those SAME owners — otherwise the locator resolves to bytes
   * but is UNREADABLE to the whiteboard's legitimate actors (the clone/update read path
   * authorizes against the document's own authorization). The authorization is applied +
   * persisted BEFORE the locator is returned — hence before the snapshot write and the
   * `contentPointer` CAS in `migrateRecord`. Returns `undefined` (letting the caller
   * decide the fallback — preserve a dangling id, or skip) when there is nothing to
   * up-home: NO `dataURL` (silently), an undecodable `data:` URI (surfaced), or a missing
   * bucket (surfaced; a bucketless record already fails in `migrateRecord`). A real
   * upload OR authorization failure THROWS → the record fails (unmigrated + re-runnable),
   * never a resolvable-but-unreadable locator, never a silent loss.
   */
  private async uphomeDataUrlAsset(
    fileId: string,
    file: LegacyBinaryFileData,
    record: LegacyContentRecord
  ): Promise<string | undefined> {
    const dataURL = typeof file?.dataURL === 'string' ? file.dataURL : '';
    if (!dataURL) {
      return undefined; // no inline bytes — caller falls back (dangling id / skip).
    }
    const decoded = parseDataUrl(dataURL);
    if (!decoded) {
      this.logger.warn?.(
        {
          message:
            'Migration: whiteboard asset dataURL is not a decodable data: URI; skipping asset',
          id: record.id,
          fileId,
        },
        LogContext.COLLABORATION_INTEGRATION
      );
      return undefined;
    }
    if (!record.storageBucketId) {
      this.logger.warn?.(
        {
          message:
            'Migration: whiteboard has no storage bucket; cannot up-home dataURL asset',
          id: record.id,
          fileId,
        },
        LogContext.COLLABORATION_INTEGRATION
      );
      return undefined;
    }
    const document =
      await this.storageBucketService.uploadFileAsDocumentFromBuffer(
        record.storageBucketId,
        decoded.buffer,
        `${fileId}${extensionForMimeType(decoded.mimeType)}`,
        decoded.mimeType
        // No actor in the one-shot operator context → createdBy stays NULL.
      );

    // Inherit + persist the TARGET bucket's authorization onto the new document through
    // the SAME owners the ordinary upload boundary uses, so the up-homed media is READABLE
    // to the whiteboard's legitimate actors. `bucket.authorization` is eager-loaded on the
    // entity (as the boundary relies on). A failure here throws → the record fails
    // (unmigrated, re-runnable), never a resolvable-but-unreadable locator.
    const bucket = await this.storageBucketService.getStorageBucketOrFail(
      record.storageBucketId
    );
    const documentAuthorizations =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        bucket.authorization
      );
    await this.authorizationPolicyService.saveAll(documentAuthorizations);

    return document.id;
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
