import { createRequire } from 'node:module';
import { CollaborationContentType, LogContext } from '@common/enums';
import { compressText, decompressText } from '@common/utils/compression.util';
import { CalloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.entity';
import {
  markdownToYjsV2State,
  yjsStateToMarkdown,
} from '@domain/common/memo/conversion';
import { Memo } from '@domain/common/memo/memo.entity';
import {
  enumerateLiveImageRefs,
  type LegacyBinaryFileData,
  type LiveImageRef,
  parseLegacyWhiteboardScene,
  whiteboardSceneToYjsV2State,
} from '@domain/common/whiteboard/conversion';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import {
  loadWhiteboardFork,
  type WhiteboardFork,
} from '@domain/common/whiteboard/whiteboard.fork';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateDocumentResult } from '@services/adapters/file-service-adapter/dto/create.document.result';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IsNull, Repository } from 'typeorm';
import { LegacyContentRecord } from './legacy.content.record';

const nodeRequire = createRequire(__filename);

/**
 * Decode snapshots with the NATIVE CommonJS `yjs` — the SAME instance the CJS headless
 * fork's `require('yjs')` resolves (path-cached), in BOTH the compiled prod worker AND
 * under the Vitest ESM runner. A bare `import * as Y from 'yjs'` resolves to `yjs.mjs`
 * under Vitest — a SECOND instance whose `Y.Doc` the fork's `Scene` (built on `yjs.cjs`)
 * cannot bind (`[yjs#509] Not same Y.Doc` → `Unexpected content type` on the first
 * write) — so the decode doc + `fork.Scene` MUST share one runtime. This makes the
 * verifier's fork path real in tests (no `loadWhiteboardFork` spy needed) and identical
 * to production. See whiteboard.fork.ts for the mirror rationale.
 */
const Y = nodeRequire('yjs') as typeof import('yjs');

const DEFAULT_BATCH_SIZE = 200;

/** The one canonical top-level Y root of a memo doc — a `Y.XmlFragment` named this. */
const MEMO_ROOT = 'default';

/**
 * Strictly decode a valid STANDARD base64 string to bytes, or `undefined` if it is NOT valid
 * standard base64 OR decodes to zero bytes. Node's `Buffer.from(x, 'base64')` is LENIENT — it
 * silently drops any non-alphabet byte and decodes whatever remains ('not-base64!!!' → 7 junk
 * bytes), so it cannot tell valid content from corruption. This validates the STANDARD alphabet
 * with padding ONLY at the end — either the canonical amount for the final quantum OR omitted
 * for an unpadded tail (a bare length `≡ 1 (mod 4)` is impossible) — after stripping historical
 * line-wrap whitespace. Shared by the inline-dataURL up-home decision AND the verifier's
 * snapshot + media byte gates so all three reject malformed/empty base64 identically.
 */
const decodeStrictBase64 = (input: string): Buffer | undefined => {
  const normalized = input.replace(/\s+/g, '');
  const match = /^([A-Za-z0-9+/]*)(=*)$/.exec(normalized);
  if (!match) {
    return undefined; // a non-alphabet byte anywhere (or padding not at the end)
  }
  const body = match[1];
  const pad = match[2].length;
  const remainder = body.length % 4;
  if (remainder === 1) {
    return undefined; // impossible bare base64 length
  }
  const requiredPad = remainder === 2 ? 2 : remainder === 3 ? 1 : 0;
  if (pad !== 0 && pad !== requiredPad) {
    return undefined; // malformed padding (wrong count / padding a complete quantum)
  }
  const buffer = Buffer.from(body, 'base64');
  return buffer.length === 0 ? undefined : buffer;
};

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
  // The base64 flag must be an EXACT bare `;base64` parameter token (case-insensitive), NOT a
  // substring — `/;base64/i` would accept `;base64junk`. Parse the `;`-separated params: a bare
  // token is valid ONLY when it is exactly `base64`; any OTHER bare token (`base64junk`,
  // `x-base64`) is a malformed marker → reject the whole descriptor (it must not silently fall
  // through and be decoded as literal ASCII). `key=value` params are ordinary and ignored, so
  // `;charset=utf-8;base64` stays valid.
  let isBase64 = false;
  for (const token of params
    .split(';')
    .map(p => p.trim())
    .filter(Boolean)) {
    if (token.toLowerCase() === 'base64') {
      isBase64 = true;
    } else if (!token.includes('=')) {
      return undefined;
    }
  }
  try {
    let buffer: Buffer | undefined;
    if (isBase64) {
      // STRICT base64 via the shared decoder — rejects any non-alphabet byte or malformed
      // padding ('not-base64!!!' would otherwise decode to 7 junk bytes and up-home garbage).
      // `undefined` here FAILS the record.
      buffer = decodeStrictBase64(data);
    } else {
      // URI-encoded (non-base64) data URL — historically supported; keep the lenient decode.
      const decoded = Buffer.from(decodeURIComponent(data), 'utf8');
      buffer = decoded.length === 0 ? undefined : decoded;
    }
    if (!buffer) {
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
 * failed (re-runnable). Pending-only at source means every reached record migrates.
 */
export interface MigrationSummary {
  total: number;
  migrated: number;
  /** Un-decodable legacy content surfaced for manual review (not migrated). */
  flagged: number;
  /**
   * A record could not be migrated (re-runnable): planning/encode rejected it (malformed
   * scene, unrepresentable live media, invalid schema/element), a snapshot write / up-home /
   * authorization failed, or the pointer CAS lost to a concurrent writer.
   */
  failed: number;
  /** The flagged document ids + reasons, for operator follow-up. */
  flaggedDocuments: { id: string; reason: string }[];
  /** Runtime failures with ids + reasons, for retry/remediation. */
  failedDocuments: { id: string; reason: string }[];
  /** True when no snapshot was written / pointer mutated (preview only). */
  dryRun: boolean;
}

/** `migrateAll` options. */
export interface MigrationOptions {
  /** When true, compute the plan + counters but write nothing (preview). */
  dryRun?: boolean;
  batchSize?: number;
}

interface CreatedMigrationArtifacts {
  assetDocumentIds: string[];
  snapshotDocumentId?: string;
}

interface LegacyWhiteboardDefaultRecord extends LegacyContentRecord {
  storedContent: string;
}

/**
 * Outcome of one `verifyAll` run — the post-release cleanup pre-flight,
 * READ-ONLY). `ok` is true only when every memo/whiteboard row carries a `contentPointer`
 * (zero NULL), every pointer RESOLVES in file-service, every resolved snapshot passes the
 * explicit cold-load-critical invariants for its type, AND every live-image locator in a
 * whiteboard resolves to non-empty content in file-service.
 */
export interface VerificationSummary {
  memoPendingMigrations: number;
  whiteboardPendingMigrations: number;
  pendingMigrationTotal: number;
  memoNullPointers: number;
  whiteboardNullPointers: number;
  nullPointerTotal: number;
  pointersChecked: number;
  /** Rows whose non-null pointer does NOT resolve in file-service (with a reason). */
  unresolved: {
    id: string;
    contentType: CollaborationContentType;
    contentPointer: string;
    reason: string;
  }[];
  /**
   * Rows whose snapshot resolved but FAILED per-row validation — corrupt / malformed-base64
   * bytes, a bucketless owner, a found-without-content or wrong-id response, a missing/unknown
   * top-level root, an invalid element ordering / element type / asset locator / appState /
   * deletion marker, OR a live image whose media locator is missing, mismatched, or resolves to
   * malformed/empty content — or whose fetch threw. Each carries id/type/pointer + a human
   * reason; the run never aborts. (Yjs does NOT encode a top-level type's constructor, so a
   * canonical root stored as the WRONG Yjs type binds to an empty canonical type and cannot be
   * rejected from bytes — a format residual, not validated here.)
   */
  invalid: {
    id: string;
    contentType: CollaborationContentType;
    contentPointer: string;
    reason: string;
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
    @InjectRepository(CalloutContributionDefaults)
    private readonly contributionDefaultsRepository: Repository<CalloutContributionDefaults>,
    private readonly fileServiceAdapter: FileServiceAdapter,
    private readonly documentService: DocumentService,
    private readonly storageBucketService: StorageBucketService,
    private readonly documentAuthorizationService: DocumentAuthorizationService
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
   *   temporary `migrated` marker is false, so a re-run after an interruption
   *   processes only the remainder; a failed upload leaves the row pending.
   * - Empty content → seeded with the canonical empty snapshot, so every back-filled
   *   row gets a resolving pointer (post-release cleanup requires zero NULL/blank
   *   pointers, then drops only the legacy content columns — the pointer stays nullable).
   *   The room still materializes empty + editable (FR-010).
   * - Un-decodable content → flagged + surfaced in the summary, NEVER dropped.
   * - `dryRun` computes the plan + counters but writes nothing.
   */
  public async migrateAll(
    options: MigrationOptions = {}
  ): Promise<MigrationSummary> {
    const documents = await this.migrateRecords(
      this.readAll(options.batchSize),
      options
    );
    const defaults = await this.migrateWhiteboardDefaults(options);
    return this.mergeMigrationSummaries(documents, defaults);
  }

  /** Migrates only legacy memos. Safe to invoke repeatedly. */
  public async migrateMemos(
    options: MigrationOptions = {}
  ): Promise<MigrationSummary> {
    return this.migrateRecords(this.readMemos(options.batchSize), options);
  }

  /** Migrates only legacy whiteboards. Safe to invoke repeatedly. */
  public async migrateWhiteboards(
    options: MigrationOptions = {}
  ): Promise<MigrationSummary> {
    const documents = await this.migrateRecords(
      this.readWhiteboards(options.batchSize),
      options
    );
    const defaults = await this.migrateWhiteboardDefaults(options);
    return this.mergeMigrationSummaries(documents, defaults);
  }

  private mergeMigrationSummaries(
    left: MigrationSummary,
    right: MigrationSummary
  ): MigrationSummary {
    return {
      total: left.total + right.total,
      migrated: left.migrated + right.migrated,
      flagged: left.flagged + right.flagged,
      failed: left.failed + right.failed,
      flaggedDocuments: [...left.flaggedDocuments, ...right.flaggedDocuments],
      failedDocuments: [...left.failedDocuments, ...right.failedDocuments],
      dryRun: left.dryRun,
    };
  }

  private async migrateWhiteboardDefaults(
    options: MigrationOptions
  ): Promise<MigrationSummary> {
    const { dryRun = false } = options;
    const summary: MigrationSummary = {
      total: 0,
      migrated: 0,
      flagged: 0,
      failed: 0,
      flaggedDocuments: [],
      failedDocuments: [],
      dryRun,
    };
    for await (const record of this.readLegacyWhiteboardDefaults(
      options.batchSize
    )) {
      summary.total++;
      if (record.flagged) {
        summary.flagged++;
        summary.flaggedDocuments.push({
          id: record.id,
          reason: record.flagReason ?? 'undecodable contribution default',
        });
        continue;
      }
      try {
        await this.migrateWhiteboardDefault(record, dryRun);
        summary.migrated++;
      } catch (error) {
        summary.failed++;
        summary.failedDocuments.push({
          id: record.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return summary;
  }

  private async migrateRecords(
    records: AsyncIterable<LegacyContentRecord>,
    options: MigrationOptions
  ): Promise<MigrationSummary> {
    const { dryRun = false } = options;
    const summary: MigrationSummary = {
      total: 0,
      migrated: 0,
      flagged: 0,
      failed: 0,
      flaggedDocuments: [],
      failedDocuments: [],
      dryRun,
    };

    for await (const record of records) {
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
        summary.failedDocuments.push({
          id: record.id,
          reason: error instanceof Error ? error.message : String(error),
        });
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
        total: summary.total,
        migrated: summary.migrated,
        flagged: summary.flagged,
        failed: summary.failed,
        dryRun: summary.dryRun,
      },
      LogContext.COLLABORATION_INTEGRATION
    );
    return summary;
  }

  /**
   * Post-release cleanup pre-flight (US6/FR-007) — READ-ONLY: proves every memo/whiteboard
   * carries a `contentPointer` (zero NULL), every pointer resolves in file-service, every
   * resolved snapshot passes the explicit cold-load-critical invariants for its type, and
   * every whiteboard live-image locator resolves to non-empty content. `ok` gates the
   * destructive content-column cleanup. No writes — peak memory is ONE snapshot decoded at a
   * time (destroyed immediately) plus AT MOST one live-media blob
   * during byte resolution, never a whole DB page; each per-row fetch/decode/schema failure is
   * captured to `invalid` while the run continues.
   */
  public async verifyAll(
    batchSize = DEFAULT_BATCH_SIZE
  ): Promise<VerificationSummary> {
    const [
      memoPendingMigrations,
      whiteboardPendingMigrations,
      memoNullPointers,
      whiteboardNullPointers,
    ] = await Promise.all([
      this.memoRepository.count({ where: { migrated: false } }),
      this.whiteboardRepository.count({ where: { migrated: false } }),
      this.memoRepository.count({ where: { contentPointer: IsNull() } }),
      this.whiteboardRepository.count({ where: { contentPointer: IsNull() } }),
    ]);
    // The whiteboard schema validator binds the decoded doc through the fork's `Scene`,
    // so load the single CommonJS fork instance once (shared `yjs.cjs` — whiteboard.fork.ts).
    const fork = await loadWhiteboardFork();
    const unresolved: VerificationSummary['unresolved'] = [];
    const invalid: VerificationSummary['invalid'] = [];
    const memoChecked = await this.verifyPointers(
      this.memoRepository as Repository<Memo | Whiteboard>,
      CollaborationContentType.MEMO,
      batchSize,
      unresolved,
      invalid,
      fork
    );
    const whiteboardChecked = await this.verifyPointers(
      this.whiteboardRepository as Repository<Memo | Whiteboard>,
      CollaborationContentType.WHITEBOARD,
      batchSize,
      unresolved,
      invalid,
      fork
    );
    const nullPointerTotal = memoNullPointers + whiteboardNullPointers;
    const pendingMigrationTotal =
      memoPendingMigrations + whiteboardPendingMigrations;
    return {
      memoPendingMigrations,
      whiteboardPendingMigrations,
      pendingMigrationTotal,
      memoNullPointers,
      whiteboardNullPointers,
      nullPointerTotal,
      pointersChecked: memoChecked + whiteboardChecked,
      unresolved,
      invalid,
      ok:
        pendingMigrationTotal === 0 &&
        nullPointerTotal === 0 &&
        unresolved.length === 0 &&
        invalid.length === 0,
    };
  }

  /**
   * Keyset-paginate the non-null pointers of one repository (joining the owner's storage
   * bucket). For EACH pointer, resolve + strict-decode its snapshot, validate the cold-load-
   * critical invariants, then resolve each unique live-image locator's bytes — ONE AT A TIME
   * (peak memory = one snapshot + at most one media response). A pointer that does not resolve
   * → `unresolved`; a bucketless owner row, a wrong-id or malformed/empty response, a resolved-
   * but-invalid snapshot, an unresolved/mismatched live-media locator, or a fetch/decode/schema
   * throw → `invalid` with a reason. Never aborts the batch. Returns the count checked.
   */
  private async verifyPointers(
    repository: Repository<Memo | Whiteboard>,
    contentType: CollaborationContentType,
    batchSize: number,
    unresolved: VerificationSummary['unresolved'],
    invalid: VerificationSummary['invalid'],
    fork: WhiteboardFork
  ): Promise<number> {
    let lastId: string | undefined;
    let checked = 0;
    for (;;) {
      // Join the owner's storage bucket in the SAME page query — the fenced verifier must
      // catch a non-null-pointer row whose owner has NO bucket: the collab-service persists
      // into each document's OWN bucket and no longer has a platform-bucket fallback, so such
      // a row now save-fails (ErrCorrupt), and `--verify` must expose it pre-rollout. This
      // explicit relation select is the load, so an unloaded relation is never the producer.
      const qb = repository
        .createQueryBuilder('doc')
        .leftJoin('doc.profile', 'profile')
        .leftJoin('profile.storageBucket', 'storageBucket')
        .select('doc.id', 'id')
        .addSelect('doc.contentPointer', 'contentPointer')
        .addSelect('storageBucket.id', 'storageBucketId')
        .where('doc.contentPointer IS NOT NULL')
        .orderBy('doc.id', 'ASC')
        .limit(batchSize);
      if (lastId !== undefined) {
        qb.andWhere('doc.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<{
        id: string;
        contentPointer: string;
        storageBucketId: string | null;
      }>();
      if (rows.length === 0) {
        break;
      }
      // Resolve + decode + validate ONE pointer per file-service call and discard each
      // response before the next. `getContentBatch` is a CONTENT endpoint (reads +
      // base64-encodes the full blob), so peak memory is one snapshot plus at most one live-
      // media response regardless of the DB page size — never the whole page. Any failure is
      // captured, not thrown.
      for (const row of rows) {
        checked++;
        try {
          if (!row.contentPointer || row.contentPointer.trim() === '') {
            invalid.push({
              id: row.id,
              contentType,
              contentPointer: row.contentPointer,
              reason:
                "contentPointer is blank/whitespace (cleanup guard: NULL OR btrim(contentPointer) = '')",
            });
            continue; // blank pointer — do NOT fetch; express the cleanup boundary here
          }
          if (!row.storageBucketId) {
            invalid.push({
              id: row.id,
              contentType,
              contentPointer: row.contentPointer,
              reason:
                "owner row has no storage bucket (the collab-service persists into each document's own bucket with no platform-bucket fallback, so this row save-fails)",
            });
            continue; // bucketless owner — do NOT fetch the blob
          }
          const [result] = await this.fileServiceAdapter.getContentBatch([
            row.contentPointer,
          ]);
          if (!result?.found) {
            unresolved.push({
              id: row.id,
              contentType,
              contentPointer: row.contentPointer,
              reason: 'file-service reported the pointer as not found',
            });
            continue;
          }
          // `getContentBatch` echoes the requested id positionally; a mismatch means file-service
          // returned content for a DIFFERENT object — reject rather than prove bytes for the
          // wrong one.
          if (result.id !== row.contentPointer) {
            invalid.push({
              id: row.id,
              contentType,
              contentPointer: row.contentPointer,
              reason: `file-service returned content for a different id (requested '${row.contentPointer}', got '${result.id}')`,
            });
            continue;
          }
          // STRICT decode: reject malformed base64, not merely zero-length — a migrated snapshot
          // is canonical base64 of a NON-empty Yjs update.
          const snapshotBytes =
            typeof result.contentBase64 === 'string'
              ? decodeStrictBase64(result.contentBase64)
              : undefined;
          if (!snapshotBytes) {
            invalid.push({
              id: row.id,
              contentType,
              contentPointer: row.contentPointer,
              reason:
                'resolved but returned no valid content (missing contentBase64, or malformed / decodes to zero bytes — a migrated snapshot is never empty)',
            });
            continue;
          }
          const liveRefs = this.verifyContent(snapshotBytes, contentType, fork);

          // Byte-resolution gate: every UNIQUE live-image locator must resolve to non-empty
          // content that is valid STANDARD base64 (canonical OR omitted padding) in file-service.
          // (The residual left un-checked is that
          // NON-empty bytes may still be an invalid image codec — deliberately not decoded here
          // because legacy content spans broad media types; the migration's exact-byte up-home
          // tests cover fidelity.) One locator per call — peak is the already-decoded snapshot
          // plus AT MOST one media response at a time. Deleted / unreferenced descriptors were
          // never enumerated, so they issue ZERO fetches; the first failing locator marks the
          // owner row invalid (naming elementId/fileId/locator).
          const seenLocators = new Set<string>();
          for (const ref of liveRefs) {
            const locator = ref.locator as string; // non-empty (structurally guaranteed by verifyContent)
            if (seenLocators.has(locator)) {
              continue;
            }
            seenLocators.add(locator);
            // Resolve the media in its OWN try/catch so a thrown fetch still names the
            // elementId/fileId/locator. The positional id MUST echo the locator (else
            // file-service returned a DIFFERENT object's bytes), and the content must STRICT-
            // decode to non-empty bytes.
            let mediaBytes: Buffer | undefined;
            let mediaReason: string | undefined;
            try {
              const [media] = await this.fileServiceAdapter.getContentBatch([
                locator,
              ]);
              if (media && media.id !== locator) {
                mediaReason = `media locator '${locator}' resolved to a different id (got '${media.id}')`;
              } else if (!media?.found) {
                mediaReason = `media locator '${locator}' does not resolve in file-service (not found)`;
              } else if (typeof media.contentBase64 !== 'string') {
                mediaReason = `media locator '${locator}' resolved without content`;
              } else {
                mediaBytes = decodeStrictBase64(media.contentBase64);
                if (!mediaBytes) {
                  mediaReason = `media locator '${locator}' resolved to malformed or empty base64 content`;
                }
              }
            } catch (mediaError) {
              mediaReason = `media locator '${locator}' failed to resolve in file-service: ${
                mediaError instanceof Error
                  ? mediaError.message
                  : 'unknown error'
              }`;
            }
            if (mediaReason) {
              invalid.push({
                id: row.id,
                contentType,
                contentPointer: row.contentPointer,
                reason: `live image '${ref.elementId}' (fileId '${ref.fileId}') ${mediaReason}`,
              });
              break; // one invalid entry per row is enough
            }
          }
        } catch (error) {
          invalid.push({
            id: row.id,
            contentType,
            contentPointer: row.contentPointer,
            reason:
              error instanceof Error
                ? error.message
                : 'unknown verification error',
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
   * Decode a resolved v2 snapshot and validate its content-root/SCHEMA for `contentType`
   * (SYNCHRONOUS — no I/O). THROWS with a human reason on any decode/schema violation (the
   * caller records it as `invalid` and continues). Returns the snapshot's LIVE image refs
   * (empty for memo, and for a whiteboard only AFTER its explicit cold-load-critical invariants
   * hold) so the async caller can resolve each live locator's BYTES as a SEPARATE gate. Decodes
   * ONE snapshot `Y.Doc`, destroyed before returning — one decoded snapshot at a time.
   */
  private verifyContent(
    bytes: Buffer,
    contentType: CollaborationContentType,
    fork: WhiteboardFork
  ): LiveImageRef[] {
    if (contentType === CollaborationContentType.MEMO) {
      this.verifyMemoContent(bytes);
      return [];
    }
    return this.verifyWhiteboardContent(bytes, fork);
  }

  /**
   * A memo snapshot must carry EXACTLY the canonical `default` root and nothing else, and
   * must convert cleanly through the real ProseMirror/markdown schema. Rejects corrupt
   * bytes, an unknown/extra root, a missing `default`, and any ProseMirror-schema violation
   * that `yjsStateToMarkdown` surfaces. (A same-named root stored as the wrong Yjs type is
   * not structurally distinguishable in Yjs — the top-level constructor is not encoded — so
   * that residual is covered only insofar as the schema conversion rejects it.)
   */
  private verifyMemoContent(bytes: Buffer): void {
    const doc = new Y.Doc();
    try {
      Y.applyUpdateV2(doc, new Uint8Array(bytes)); // throws on corrupt/undecodable bytes
      const roots = [...doc.share.keys()];
      const unknown = roots.filter(root => root !== MEMO_ROOT);
      if (unknown.length > 0) {
        throw new Error(
          `memo has unknown top-level root(s): ${unknown.join(', ')}`
        );
      }
      if (!doc.share.has(MEMO_ROOT)) {
        throw new Error(`memo is missing the canonical '${MEMO_ROOT}' root`);
      }
    } finally {
      doc.destroy();
    }
    // Exercise the real Yjs→ProseMirror→markdown conversion (binds getXmlFragment(default);
    // re-decodes internally — one small blob). A malformed fragment / unsupported node throws.
    yjsStateToMarkdown(bytes);
  }

  /**
   * Validate a whiteboard snapshot against the explicitly enforced, COLD-LOAD-CRITICAL schema
   * invariants (NOT a full Excalidraw JSON validator), then return its LIVE image refs (never
   * fetches). Valid when it is a truly empty bare doc, OR its top-level roots are a SUBSET of
   * the fork's canonical set (`elements`/`files`/`appState`/`elementDeletions` — a valid
   * partial is accepted) AND: every element is a real Excalidraw element (known type) with
   * valid fractional-index + bound-text ordering; asset locators are well-formed strings;
   * every LIVE image's non-null `fileId` is a non-empty string; appState carries only
   * allow-list keys with string values; and every deletion marker is a finite, non-negative
   * number. Unknown roots are captured BEFORE constructing `Scene` (whose constructor binds
   * all four canonical roots). Live image refs are enumerated ONLY after those invariants
   * hold, and each must resolve to a non-empty file-map locator (structural). The returned
   * refs feed the async byte-resolution gate. Scene + doc destroyed.
   */
  private verifyWhiteboardContent(
    bytes: Buffer,
    fork: WhiteboardFork
  ): LiveImageRef[] {
    const doc = new Y.Doc();
    let scene: InstanceType<WhiteboardFork['Scene']> | undefined;
    try {
      Y.applyUpdateV2(doc, new Uint8Array(bytes)); // throws on corrupt/undecodable bytes

      // Roots must be captured BEFORE Scene binds the canonical roots. A truly empty bare
      // doc (no roots) is valid; otherwise every root must be canonical (partial allowed).
      const canonicalRoots = new Set<string>([
        fork.ELEMENTS,
        fork.FILES,
        fork.APPSTATE,
        fork.ELEMENT_DELETIONS,
      ]);
      const unknown = [...doc.share.keys()].filter(
        root => !canonicalRoots.has(root)
      );
      if (unknown.length > 0) {
        throw new Error(
          `whiteboard has unknown top-level root(s): ${unknown.join(', ')}`
        );
      }

      // Bind + materialize through the real fork Scene, then validate element ordering +
      // bound text (throws on an invalid fractional index / bound-text structure).
      scene = new fork.Scene(undefined, { doc });
      const elements = scene.getElementsIncludingDeleted();
      fork.validateFractionalIndices(elements, {
        shouldThrow: true,
        includeBoundTextValidation: true,
        ignoreLogs: true,
      });

      // Materialized-element schema (cold-load-critical, NOT a full Excalidraw validator):
      // `validateFractionalIndices` checks only ordering + bound text, and `yMapToElement` is
      // a raw duck materializer, so an element with an UNKNOWN `type` (e.g. 'garbage') would
      // otherwise pass. Require every element to be a real Excalidraw element, and every LIVE
      // image's non-null `fileId` to be a NON-EMPTY string BEFORE enumeration casts it (a
      // number, or '' paired with a FILES[''] entry, must not slip through). A `null`/absent
      // fileId is a permitted uninitialized image — simply not an asset reference.
      for (const element of elements) {
        if (!fork.isExcalidrawElement(element)) {
          throw new Error(
            `whiteboard element '${(element as { id?: string }).id ?? '?'}' is not a valid Excalidraw element (unknown or malformed type)`
          );
        }
        const image = element as {
          id?: string;
          type?: string;
          isDeleted?: boolean;
          fileId?: unknown;
        };
        if (
          image.type === 'image' &&
          image.isDeleted !== true &&
          image.fileId != null &&
          (typeof image.fileId !== 'string' || image.fileId.length === 0)
        ) {
          throw new Error(
            `whiteboard live image element '${image.id ?? '?'}' has a non-string or empty fileId`
          );
        }
      }

      // Asset locators: readAssetLocators throws on any non-string / malformed FILES value.
      const assets = fork.readAssetLocators(doc.getMap(fork.FILES));

      // appState: readAppState silently ignores unknown keys, so inspect the map DIRECTLY —
      // reject any non-allow-list key and require each stored allowed value be a string.
      const appState = doc.getMap(fork.APPSTATE);
      const allow = new Set<string>(fork.APPSTATE_ALLOW_LIST);
      for (const [key, value] of appState.entries()) {
        if (!allow.has(key)) {
          throw new Error(
            `whiteboard appState has a non-allow-list key '${key}'`
          );
        }
        if (typeof value !== 'string') {
          throw new Error(
            `whiteboard appState key '${key}' must be a string (got ${typeof value})`
          );
        }
      }

      // Deletion markers (element id → deletion timestamp): every value finite and >= 0.
      const deletions = doc.getMap(fork.ELEMENT_DELETIONS);
      for (const [id, value] of deletions.entries()) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
          throw new Error(
            `whiteboard deletion marker for '${id}' must be a finite, non-negative number`
          );
        }
      }

      // Only AFTER the cold-load-critical invariants hold: enumerate the LIVE image refs and
      // require each carries a non-empty file-map locator (the STRUCTURAL cold-load invariant).
      // Return the refs — plain strings, safe past the `finally` teardown — for the byte gate.
      const liveRefs = enumerateLiveImageRefs(doc, fork, assets);
      for (const ref of liveRefs) {
        if (typeof ref.locator !== 'string' || ref.locator.length === 0) {
          throw new Error(
            `whiteboard live image element '${ref.elementId}' references fileId '${ref.fileId}' with no file-map locator`
          );
        }
      }
      return liveRefs;
    } finally {
      scene?.destroy();
      doc.destroy();
    }
  }

  /**
   * Migrates one legacy record (the reader selects `migrated = false` at source
   * and joins the storage bucket, so there is NO per-document
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

    const isMemo = record.contentType === CollaborationContentType.MEMO;
    const repository = (
      isMemo ? this.memoRepository : this.whiteboardRepository
    ) as Repository<Memo | Whiteboard>;

    // `migrated=false` plus a pointer is an INCONSISTENT state. A competing
    // migration cannot produce it because its CAS writes pointer + marker in one
    // statement; it therefore identifies an incompatible/non-atomic writer. Do
    // not bless that pointer: it may be an empty snapshot produced without ever
    // reading the retained legacy content.
    if (record.contentPointer?.trim()) {
      throw new Error(
        `Document ${record.id} is not migrated but already has content pointer ${record.contentPointer}; refusing to trust a non-atomic writer`
      );
    }

    const fork = await loadWhiteboardFork();
    const createdArtifacts: CreatedMigrationArtifacts = {
      assetDocumentIds: [],
    };

    // 1. PLANNING (zero writes): build a REPRESENTABILITY-only snapshot — media resolved to
    //    synthetic/structural locators, no uploads, no auth, no Alkemio-doc lookups — then
    //    verifyContent it. This catches a malformed scene and every schema/structural defect
    //    (an external-only live image, a non-array `elements`, a corrupt memo) BEFORE any side
    //    effect. A throw propagates to migrateAll's per-record catch as `failed`, leaving the
    //    pointer NULL and re-runnable. (Dry-run does NOT prove file-service resolution of the
    //    CURRENT locators — post-migrate `--verify` is the definitive resolution gate.)
    const planned = await this.encodeSnapshot(record, true);
    this.verifyContent(planned, record.contentType, fork);
    if (dryRun) {
      return; // dry-run stops after planning — provably zero writes
    }

    // 2. REAL: resolve media for real (Alkemio-doc lookups + dataURL up-home writes), build the
    //    FINAL snapshot, and verifyContent it BEFORE upload/CAS — never persist bytes the
    //    verifier would reject. EVERY reached (null-pointer) record is seeded, including empty
    //    content (encodeSnapshot returns the canonical empty Y.Doc), so no row is left null.
    let result: CreateDocumentResult;
    try {
      const snapshot = await this.encodeSnapshot(
        record,
        false,
        createdArtifacts
      );
      this.verifyContent(snapshot, record.contentType, fork);
      result = await this.fileServiceAdapter.createSnapshotInBucket(
        snapshot,
        record.storageBucketId
      );
      // Only a row inserted by this request belongs to this attempt. A reused
      // file id is owned by file-service and must never be compensated here.
      if (result.reused === false) {
        createdArtifacts.snapshotDocumentId = result.id;
      }
    } catch (error) {
      // The pointer CAS has not started. Compensate only rows that file-service
      // reports were inserted by this request; reused ids are never tracked.
      const cleanupFailures = await this.cleanupCreatedArtifacts(
        record.id,
        createdArtifacts
      );
      if (cleanupFailures > 0) {
        throw new Error(
          `Migration failed and artifact compensation was incomplete: ${String(error)}`
        );
      }
      throw error;
    }

    // First-writer-wins CAS: the live collab-service save path can assign a NEWER
    // pointer while this upload is in flight, so an `id`-only UPDATE could clobber
    // newer content. The pointer + marker move atomically while still pending.
    let updateResult;
    try {
      updateResult = await repository
        .createQueryBuilder()
        .update()
        .set({
          contentPointer: result.id,
          contentVersion: 0,
          migrated: true,
        })
        .where('id = :id AND "migrated" = false AND "contentPointer" IS NULL', {
          id: record.id,
        })
        .execute();
    } catch (error) {
      // A transport/driver error does not prove whether PostgreSQL committed.
      // Re-read the atomic tuple before compensating. A different/no winner lets
      // us remove only rows inserted by this attempt; the same pointer is
      // canonical and must stay.
      let convergedPointer: string | undefined;
      try {
        convergedPointer = await this.getConvergedPointer(
          repository,
          record.id
        );
      } catch (reconciliationError) {
        // If reconciliation itself is unavailable, preserving a possible orphan
        // is safer than deleting a snapshot that may be canonical.
        this.logger.warn?.(
          {
            message:
              'Migration: pointer publication outcome is unknown; preserving created artifacts',
            id: record.id,
            error: String(error),
            reconciliationError: String(reconciliationError),
          },
          LogContext.COLLABORATION_INTEGRATION
        );
        throw error;
      }
      if (convergedPointer === result.id) {
        return;
      }
      const cleanupFailures = await this.cleanupCreatedArtifacts(
        record.id,
        createdArtifacts
      );
      if (cleanupFailures > 0) {
        throw new Error(
          'Pointer publication was inconclusive and artifact compensation was incomplete'
        );
      }
      if (convergedPointer) {
        return;
      }
      throw error;
    }
    if (updateResult.affected === 1) {
      return;
    }

    // A concurrent migration may already have completed both fields. If the
    // canonical pointer is our exact result, it must stay. With a different
    // winner, compensate only rows inserted by this attempt before reporting
    // convergence.
    let convergedPointer: string | undefined;
    try {
      convergedPointer = await this.getConvergedPointer(repository, record.id);
    } catch (error) {
      // The CAS definitely did not update, but without the current pointer we
      // cannot prove whether our exact snapshot became canonical through an
      // ambiguous concurrent path. Preserve rather than risk deleting content.
      this.logger.warn?.(
        {
          message:
            'Migration: could not reconcile a losing CAS; preserving created artifacts',
          id: record.id,
          error: String(error),
        },
        LogContext.COLLABORATION_INTEGRATION
      );
      throw error;
    }
    if (convergedPointer) {
      if (convergedPointer !== result.id) {
        const cleanupFailures = await this.cleanupCreatedArtifacts(
          record.id,
          createdArtifacts
        );
        if (cleanupFailures > 0) {
          throw new Error(
            'Concurrent migration converged but artifact compensation was incomplete'
          );
        }
      }
      return;
    }

    // Known negative outcome: our CAS changed nothing and no atomic winner is
    // visible. This attempt's explicitly-new artifacts are unreachable.
    const cleanupFailures = await this.cleanupCreatedArtifacts(
      record.id,
      createdArtifacts
    );
    if (cleanupFailures > 0) {
      throw new Error(
        'Migration CAS did not converge and artifact compensation was incomplete'
      );
    }
    throw new Error(
      `Document ${record.id} did not converge after migration CAS (affected=${updateResult.affected})`
    );
  }

  private async migrateWhiteboardDefault(
    record: LegacyWhiteboardDefaultRecord,
    dryRun: boolean
  ): Promise<void> {
    if (!record.storageBucketId) {
      throw new Error(
        `Contribution default ${record.id} has no owning Callout storage bucket`
      );
    }
    const fork = await loadWhiteboardFork();
    const planned = await this.encodeSnapshot(record, true);
    this.verifyContent(planned, CollaborationContentType.WHITEBOARD, fork);
    if (dryRun) {
      return;
    }

    const createdArtifacts: CreatedMigrationArtifacts = {
      assetDocumentIds: [],
    };
    let canonical: string;
    try {
      const snapshot = await this.encodeSnapshot(
        record,
        false,
        createdArtifacts
      );
      this.verifyContent(snapshot, CollaborationContentType.WHITEBOARD, fork);
      canonical = await compressText(snapshot.toString('base64'));
    } catch (error) {
      const cleanupFailures = await this.cleanupCreatedArtifacts(
        record.id,
        createdArtifacts
      );
      if (cleanupFailures > 0) {
        throw new Error(
          `Contribution-default migration failed and media compensation was incomplete: ${String(error)}`
        );
      }
      throw error;
    }

    let affected: number | undefined;
    try {
      const result = await this.contributionDefaultsRepository
        .createQueryBuilder()
        .update()
        .set({ whiteboardContent: canonical })
        .where('id = :id AND "whiteboardContent" = :storedContent', {
          id: record.id,
          storedContent: record.storedContent,
        })
        .execute();
      affected = result.affected;
    } catch (error) {
      const current = await this.readStoredDefaultContent(record.id).catch(
        () => undefined
      );
      if (current === canonical) {
        return;
      }
      if (current === undefined) {
        this.logger.warn?.(
          {
            message:
              'Migration: contribution-default publication outcome is unknown; preserving up-homed media',
            id: record.id,
            error: String(error),
          },
          LogContext.COLLABORATION_INTEGRATION
        );
        throw error;
      }
      const cleanupFailures = await this.cleanupCreatedArtifacts(
        record.id,
        createdArtifacts
      );
      if (cleanupFailures > 0) {
        throw new Error(
          `Contribution-default publication failed and media compensation was incomplete: ${String(error)}`
        );
      }
      throw error;
    }

    if (affected === 1) {
      return;
    }
    const current = await this.readStoredDefaultContent(record.id);
    if (current === canonical) {
      return;
    }
    const cleanupFailures = await this.cleanupCreatedArtifacts(
      record.id,
      createdArtifacts
    );
    if (cleanupFailures > 0) {
      throw new Error(
        'Contribution-default CAS lost and media compensation was incomplete'
      );
    }
    if (
      current &&
      current !== record.storedContent &&
      (await this.isCanonicalStoredWhiteboardDefault(current))
    ) {
      return;
    }
    throw new Error(
      `Contribution default ${record.id} did not converge after migration CAS`
    );
  }

  private async readStoredDefaultContent(
    id: string
  ): Promise<string | undefined> {
    const rows = await this.contributionDefaultsRepository.query(
      'SELECT "whiteboardContent" FROM "callout_contribution_defaults" WHERE "id" = $1',
      [id]
    );
    return rows[0]?.whiteboardContent ?? undefined;
  }

  private async isCanonicalStoredWhiteboardDefault(
    storedContent: string
  ): Promise<boolean> {
    try {
      const content = await decompressText(storedContent);
      const bytes = decodeStrictBase64(content);
      if (!bytes) {
        return false;
      }
      const fork = await loadWhiteboardFork();
      this.verifyContent(bytes, CollaborationContentType.WHITEBOARD, fork);
      return true;
    } catch {
      return false;
    }
  }

  private async getConvergedPointer(
    repository: Repository<Memo | Whiteboard>,
    id: string
  ): Promise<string | undefined> {
    const current = await repository
      .createQueryBuilder('doc')
      .select('doc.migrated', 'migrated')
      .addSelect('doc.contentPointer', 'contentPointer')
      .where('doc.id = :id', { id })
      .getRawOne<{ migrated: boolean; contentPointer: string | null }>();
    return current?.migrated && current.contentPointer?.trim()
      ? current.contentPointer
      : undefined;
  }

  private async cleanupCreatedArtifacts(
    recordId: string,
    artifacts: CreatedMigrationArtifacts
  ): Promise<number> {
    const assetDocumentIds = artifacts.assetDocumentIds.splice(0);
    const snapshotDocumentId = artifacts.snapshotDocumentId;
    artifacts.snapshotDocumentId = undefined;
    let failures = 0;

    await Promise.all([
      ...assetDocumentIds.map(id =>
        this.documentService.deleteDocument({ ID: id }).catch(error => {
          failures += 1;
          this.logger.warn?.(
            {
              message:
                'Migration: failed to compensate an up-homed asset after migration failure',
              id: recordId,
              artifactId: id,
              error: String(error),
            },
            LogContext.COLLABORATION_INTEGRATION
          );
        })
      ),
      ...(snapshotDocumentId
        ? [
            this.fileServiceAdapter
              .deleteDocument(snapshotDocumentId)
              .catch(error => {
                failures += 1;
                this.logger.warn?.(
                  {
                    message:
                      'Migration: failed to compensate a snapshot after migration failure',
                    id: recordId,
                    artifactId: snapshotDocumentId,
                    error: String(error),
                  },
                  LogContext.COLLABORATION_INTEGRATION
                );
              }),
          ]
        : []),
    ]);
    return failures;
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
   * so the back-fill still assigns a resolving pointer — never a NULL/skip (cleanup's
   * fenced guard requires zero NULL/blank pointers before dropping only the legacy content
   * columns; the pointer column stays nullable). Same canonical empty encodings the create
   * path seeds.
   */
  private async encodeSnapshot(
    record: LegacyContentRecord,
    planning: boolean,
    createdArtifacts?: CreatedMigrationArtifacts
  ): Promise<Buffer> {
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
    // Malformed-nonempty-scene gate: `parseLegacyWhiteboardScene` returns `undefined` for
    // unparseable JSON OR a valid-JSON object whose `elements` is missing / not an array —
    // the SAME `undefined` the encoder maps to the canonical EMPTY doc, which would SILENTLY
    // discard real content. Fail the record instead. A genuinely empty / whitespace legacy
    // value is canonical-empty and passes (it is never parsed as a scene).
    if (
      sceneJSON.trim() !== '' &&
      parseLegacyWhiteboardScene(sceneJSON) === undefined
    ) {
      throw new Error(
        'whiteboard legacy content is nonempty but not a parseable Excalidraw scene (malformed JSON or missing/non-array elements); refusing to migrate it as empty'
      );
    }
    // `planning` (dry-run) resolves media to REPRESENTABLE synthetic/structural locators with
    // ZERO writes; the real path performs the Alkemio-doc lookups + dataURL up-home. The
    // shared cold-load image→locator invariant is enforced by the CALLER's `verifyContent` on
    // the resulting snapshot (one owner) BEFORE any upload/CAS — a live image that resolved to
    // no locator fails the record there.
    const assetLocators = await this.resolveWhiteboardAssetLocators(
      sceneJSON,
      record,
      planning,
      createdArtifacts
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
   * unrecoverable entry (malformed/undecodable, no usable url or bytes) is dropped here
   * (never a crash) — but if a LIVE image element references it, `migrateRecord`'s
   * `verifyContent` then FAILS the record at the shared image→locator boundary
   * (`enumerateLiveImageRefs`), so a broken live image never migrates; only an UNREFERENCED
   * (or deleted-only) dropped entry passes. `planning` selects representability-only
   * resolution (zero writes) vs the real Alkemio-doc lookups + dataURL up-home.
   * A transient upload/read failure THROWS and fails the record (re-runnable) rather than
   * silently dropping media. Returns an empty map for an empty/undecodable scene or one
   * with no media.
   */
  private async resolveWhiteboardAssetLocators(
    sceneJSON: string,
    record: LegacyContentRecord,
    planning: boolean,
    createdArtifacts?: CreatedMigrationArtifacts
  ): Promise<Record<string, string>> {
    const files = parseLegacyWhiteboardScene(sceneJSON)?.files;
    if (!files) {
      return {};
    }
    const locators: Record<string, string> = {};
    for (const [fileId, file] of Object.entries(files)) {
      const locator = await this.resolveLegacyFileLocator(
        fileId,
        file,
        record,
        planning,
        createdArtifacts
      );
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
    record: LegacyContentRecord,
    planning: boolean,
    createdArtifacts?: CreatedMigrationArtifacts
  ): Promise<string | undefined> {
    const url = typeof file?.url === 'string' ? file.url.trim() : '';
    const isAlkemioUrl =
      url !== '' && this.documentService.isAlkemioDocumentURL(url);

    if (planning) {
      // PLANNING (dry-run): prove the descriptor is REPRESENTABLE with ZERO writes, no auth,
      // and no DB — never the real locator. An Alkemio doc URL is representable by its embedded
      // structural id; a decodable inline dataURL is representable by a deterministic synthetic
      // locator; everything else (external-only url with no bytes, undecodable dataURL) is
      // UNREPRESENTABLE → undefined, so a LIVE image referencing it FAILS the planning
      // snapshot's verifyContent before any real work. Post-migrate `--verify` remains the
      // definitive file-service-resolution gate for the CURRENT locators.
      if (isAlkemioUrl) {
        const base = this.documentService.getDocumentsBaseUrlPath();
        const id = url.substring(base.length + 1);
        if (id) {
          return id;
        }
      }
      return this.planDataUrlLocator(fileId, file);
    }

    // 1–3. Alkemio file-service document URL.
    if (isAlkemioUrl) {
      const document = await this.documentService.getDocumentFromURL(url, {
        loadEagerRelations: false,
      });
      if (document) {
        return document.id; // 1. live row → its document id.
      }
      // 2. Row gone, but inline bytes are still there (recoverable) → up-home them.
      const uphomed = await this.uphomeDataUrlAsset(
        fileId,
        file,
        record,
        createdArtifacts
      );
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
    const uphomed = await this.uphomeDataUrlAsset(
      fileId,
      file,
      record,
      createdArtifacts
    );
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
   * PLANNING-only (dry-run) counterpart to {@link uphomeDataUrlAsset}: decides whether an
   * inline `dataURL` is REPRESENTABLE without any write. A decodable `data:` URI yields a
   * deterministic synthetic locator (`planning-locator:<fileId>`) — non-empty and bounded, so
   * a live image referencing it passes the structural cold-load check; the planning snapshot
   * is validated then DISCARDED (never uploaded), so the synthetic string never persists. No
   * `dataURL`, or an undecodable one, is unrepresentable → `undefined`.
   */
  private planDataUrlLocator(
    fileId: string,
    file: LegacyBinaryFileData
  ): string | undefined {
    const dataURL = typeof file?.dataURL === 'string' ? file.dataURL : '';
    if (!dataURL || !parseDataUrl(dataURL)) {
      return undefined;
    }
    return `planning-locator:${fileId}`;
  }

  /**
   * Up-homes a legacy inline `dataURL` image into the whiteboard's OWN storage bucket
   * (the earliest owner) as a real, authorized file-service document, and returns its
   * id as the opaque locator string. `uploadFileAsDocumentFromBuffer` creates the row
   * with a BLANK document authorization; the ordinary upload boundary
   * (`StorageBucketResolverMutations.uploadFileOnStorageBucket`) immediately inherits the
   * bucket policy via `DocumentAuthorizationService.applyAuthorizationPolicy(document,
   * bucket.authorization)`, so the migration MUST do the same through that SAME owner —
   * otherwise the locator resolves to bytes but is UNREADABLE to the whiteboard's
   * legitimate actors (the clone/update read path authorizes against the document's own
   * authorization). `applyAuthorizationPolicy` both applies AND persists the inherited
   * policy internally (its own `saveAll`; it returns no rules for the caller to save), and
   * it is awaited BEFORE the locator is returned — hence before the snapshot write and the
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
    record: LegacyContentRecord,
    createdArtifacts?: CreatedMigrationArtifacts
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

    // Only rows inserted by this request are attempt-owned. A reused file id
    // belongs to file-service and must never be compensated by the migration.
    if (document.reused === false) {
      // Track at the earliest point after creation. Bucket lookup or authorization
      // can still fail, and the outer record-level compensation must see this row.
      createdArtifacts?.assetDocumentIds.push(document.id);
    }

    // Inherit + persist the TARGET bucket's authorization onto the new document through
    // the SAME owners the ordinary upload boundary uses, so the up-homed media is READABLE
    // to the whiteboard's legitimate actors. `bucket.authorization` is eager-loaded on the
    // entity (as the boundary relies on). A failure here throws → the record fails
    // (unmigrated, re-runnable), never a resolvable-but-unreadable locator.
    const bucket = await this.storageBucketService.getStorageBucketOrFail(
      record.storageBucketId
    );
    // `applyAuthorizationPolicy` is the SOLE authorization owner here: it inherits the
    // bucket policy AND persists it internally (its own `saveAll` over the document +
    // tagset authorizations), returning no rules for the caller to save — so there is no
    // redundant outer `saveAll([])`. Awaited BEFORE the locator is returned — hence before
    // the snapshot write and the `contentPointer` CAS in `migrateRecord`.
    await this.documentAuthorizationService.applyAuthorizationPolicy(
      document,
      bucket.authorization
    );

    return document.id;
  }

  private async *readLegacyWhiteboardDefaults(
    batchSize = DEFAULT_BATCH_SIZE
  ): AsyncGenerator<LegacyWhiteboardDefaultRecord> {
    const fork = await loadWhiteboardFork();
    let lastId = '';
    for (;;) {
      const rows = await this.contributionDefaultsRepository.query(
        `SELECT defaults."id" AS "id",
                defaults."whiteboardContent" AS "storedContent",
                bucket."id" AS "storageBucketId"
           FROM "callout_contribution_defaults" defaults
           JOIN "callout" callout
             ON callout."contributionDefaultsId" = defaults."id"
           JOIN "callout_framing" framing
             ON callout."framingId" = framing."id"
           JOIN "profile" profile
             ON framing."profileId" = profile."id"
      LEFT JOIN "storage_bucket" bucket
             ON profile."storageBucketId" = bucket."id"
          WHERE defaults."whiteboardContent" IS NOT NULL
            AND defaults."id" > $1
       ORDER BY defaults."id" ASC
          LIMIT $2`,
        [lastId, batchSize]
      );
      if (rows.length === 0) {
        break;
      }
      for (const row of rows as Array<{
        id: string;
        storedContent: string;
        storageBucketId: string | null;
      }>) {
        lastId = row.id;
        let content: string;
        try {
          content = await decompressText(row.storedContent);
        } catch (error) {
          yield {
            id: row.id,
            contentType: CollaborationContentType.WHITEBOARD,
            storageBucketId: row.storageBucketId ?? undefined,
            storedContent: row.storedContent,
            flagged: true,
            flagReason: `contribution_default_decompression_failed: ${String(error)}`,
          };
          continue;
        }
        if (!content.trim() || parseLegacyWhiteboardScene(content)) {
          yield {
            id: row.id,
            contentType: CollaborationContentType.WHITEBOARD,
            content,
            storageBucketId: row.storageBucketId ?? undefined,
            storedContent: row.storedContent,
          };
          continue;
        }
        try {
          const bytes = decodeStrictBase64(content);
          if (!bytes) {
            throw new Error('not a non-empty canonical base64 snapshot');
          }
          this.verifyContent(bytes, CollaborationContentType.WHITEBOARD, fork);
        } catch (error) {
          yield {
            id: row.id,
            contentType: CollaborationContentType.WHITEBOARD,
            content,
            storageBucketId: row.storageBucketId ?? undefined,
            storedContent: row.storedContent,
            flagged: true,
            flagReason: `contribution_default_invalid: ${String(error)}`,
          };
        }
      }
      if (rows.length < batchSize) {
        break;
      }
    }
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
      // Select ONLY not-yet-migrated memos (`migrated = false`) and join the
      // document's own storage bucket in
      // the SAME page query — so the back-fill needs no per-document metadata
      // SELECT. `memo.content` is the inline Yjs-V2 column RETAINED in Release A
      // (unmapped on the entity, migration-only) and dropped only in cleanup;
      // this raw select intentionally does NOT go through the entity mapping.
      const qb = this.memoRepository
        .createQueryBuilder('memo')
        .leftJoin('memo.profile', 'profile')
        .leftJoin('profile.storageBucket', 'storageBucket')
        .select('memo.id', 'id')
        .addSelect('memo.content', 'content')
        .addSelect('memo.contentPointer', 'contentPointer')
        .addSelect('storageBucket.id', 'storageBucketId')
        .where('memo.migrated = false')
        .orderBy('memo.id', 'ASC')
        .limit(batchSize);
      if (lastId !== undefined) {
        qb.andWhere('memo.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<{
        id: string;
        content: Buffer | null;
        contentPointer: string | null;
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
          contentPointer: row.contentPointer ?? undefined,
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
      // Pending-only at source (see readMemos): only not-yet-migrated whiteboards are
      // selected + decompressed, so an already-migrated whiteboard with stale/
      // corrupt RETAINED legacy content is never touched. `whiteboard.content` is
      // the inline column RETAINED in Release A (unmapped on the entity,
      // migration-only) and dropped only in cleanup. Read the RAW (compressed)
      // content via the query builder so the corrupt-blob case is flagged per-row
      // rather than aborting the batch; the storage bucket is joined here.
      const qb = this.whiteboardRepository
        .createQueryBuilder('whiteboard')
        .leftJoin('whiteboard.profile', 'profile')
        .leftJoin('profile.storageBucket', 'storageBucket')
        .select('whiteboard.id', 'id')
        .addSelect('whiteboard.content', 'content')
        .addSelect('whiteboard.contentPointer', 'contentPointer')
        .addSelect('storageBucket.id', 'storageBucketId')
        .where('whiteboard.migrated = false')
        .orderBy('whiteboard.id', 'ASC')
        .limit(batchSize);
      if (lastId !== undefined) {
        qb.andWhere('whiteboard.id > :lastId', { lastId });
      }
      const rows = await qb.getRawMany<{
        id: string;
        content: string | null;
        contentPointer: string | null;
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
    contentPointer: string | null;
    storageBucketId: string | null;
  }): Promise<LegacyContentRecord> {
    const base: LegacyContentRecord = {
      id: row.id,
      contentType: CollaborationContentType.WHITEBOARD,
      contentPointer: row.contentPointer ?? undefined,
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
