import { createRequire } from 'node:module';
import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { compressText } from '@common/utils/compression.util';
import { markdownToYjsV2State } from '@domain/common/memo/conversion';
import { Memo } from '@domain/common/memo/memo.entity';
import { whiteboardSceneToYjsV2State } from '@domain/common/whiteboard/conversion';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import * as whiteboardFork from '@domain/common/whiteboard/whiteboard.fork';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import type * as Yjs from 'yjs';
import { CollaborationMigrationService } from './collaboration-migration.service';
import { LegacyContentRecord } from './legacy.content.record';

/**
 * Native-CJS `yjs` — the SAME single instance the service's verifier and the CJS headless
 * fork resolve, in BOTH prod and under the Vitest ESM runner. Building fixtures on this one
 * instance (rather than a bare `import * as Y from 'yjs'`, which is `yjs.mjs` under Vitest)
 * keeps the spec's `Y.Doc`s and the fork's `Scene` on ONE runtime — no `[yjs#509]` split —
 * and is why no `loadWhiteboardFork` spy is needed.
 */
const Y = createRequire(__filename)('yjs') as typeof import('yjs');

/**
 * A minimal `DocumentService` stub. `getDocumentFromURL` resolves a legacy
 * `BinaryFileData.url` to its file-service document (whose `.id` is the locator);
 * the URL helpers mirror the real base-path id extraction the dangling-ref
 * fallback uses.
 */
const documentServiceMock = () => ({
  getDocumentFromURL: vi.fn(),
  isAlkemioDocumentURL: vi.fn((url: string) =>
    url.startsWith('https://alkem.io/api/private/rest/storage/document')
  ),
  getDocumentsBaseUrlPath: vi.fn(
    () => 'https://alkem.io/api/private/rest/storage/document'
  ),
});

/**
 * A store-backed `StorageBucketService` stub — the closest existing boundary to a
 * real file-service bucket. `uploadFileAsDocumentFromBuffer` records the uploaded
 * bytes under a freshly-minted document id (the locator) and returns `{ id }`, so a
 * test can later RESOLVE that locator back to the exact bytes + bucket it landed in
 * (proving the image survives cold-load, not just that a string was written). A
 * test may still `mockResolvedValue`/`mockRejectedValue` to override the default.
 */
const storageBucketServiceMock = () => {
  const store = new Map<string, { bucketId: string; bytes: Buffer }>();
  let seq = 0;
  const uploadFileAsDocumentFromBuffer = vi.fn(
    async (
      bucketId: string,
      buffer: Uint8Array,
      _filename?: string,
      _mimeType?: string
    ) => {
      const id = `uphomed-doc-${++seq}`;
      store.set(id, { bucketId, bytes: Buffer.from(buffer) });
      return { id } as any;
    }
  );
  // The up-home path re-loads the bucket to inherit its (eager) authorization onto the
  // new document — mirror that with a bucket carrying a resolvable authorization policy.
  const getStorageBucketOrFail = vi.fn(async (bucketId: string) => ({
    id: bucketId,
    authorization: { id: 'bucket-auth' },
  }));
  return { uploadFileAsDocumentFromBuffer, getStorageBucketOrFail, store };
};

/**
 * `DocumentAuthorizationService` stub — the up-home path inherits the target bucket's
 * authorization onto the freshly-uploaded document through this owner, exactly as the
 * ordinary upload boundary does (this version persists internally + returns []).
 */
const documentAuthorizationServiceMock = () => ({
  applyAuthorizationPolicy: vi.fn(
    async (_document: any, _parentAuthorization: any) => [] as any[]
  ),
});

/**
 * A COMPLETE minimal valid PNG (1x1 RGB: signature + IHDR + IDAT + IEND). The up-home
 * SUCCESS fixtures use it so they represent bytes real file-service / libvips actually
 * accepts — not a truncated 8-byte signature (which the in-memory store tolerates but
 * production rejects). Used as BOTH the inline dataURL payload and the exact-byte
 * assertion so they stay in lockstep.
 */
const VALID_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
const VALID_PNG_DATA_URL = `data:image/png;base64,${VALID_PNG_B64}`;

/**
 * Full cold-load chain resolver: decode the STORED fork snapshot → find the LIVE
 * (non-deleted) image element referencing `fileId` → read its FILES locator →
 * resolve that locator in the bucket store to the bytes it holds. THROWS if ANY
 * link is broken, so a test built on it fails the moment the element↔fileId,
 * fileId↔locator, or locator↔bytes chain is sabotaged.
 */
const resolveImageFromStore = async (
  snapshot: Uint8Array,
  fileId: string,
  store: Map<string, { bucketId: string; bytes: Buffer }>
): Promise<{ bucketId: string; bytes: Buffer }> => {
  const fork: any = await whiteboardFork.loadWhiteboardFork();
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, snapshot);
  let liveImage = false;
  for (const [, ymap] of doc.getMap(fork.ELEMENTS).entries()) {
    const el = fork.yMapToElement(ymap) as Record<string, unknown>;
    if (el.type === 'image' && el.fileId === fileId && el.isDeleted !== true) {
      liveImage = true;
      break;
    }
  }
  const locator = (
    fork.readAssetLocators(doc.getMap(fork.FILES)) as Record<string, string>
  )[fileId];
  doc.destroy();
  if (!liveImage) {
    throw new Error(`no live image element references fileId ${fileId}`);
  }
  if (!locator) {
    throw new Error(`FILES has no locator for fileId ${fileId}`);
  }
  const stored = store.get(locator);
  if (!stored) {
    throw new Error(`locator ${locator} does not resolve in the bucket store`);
  }
  return stored;
};

/** Re-encode a stored snapshot with the FILES locator for `fileId` replaced (sabotage). */
const tamperLocator = async (
  snapshot: Uint8Array,
  fileId: string,
  badLocator: string
): Promise<Uint8Array> => {
  const fork: any = await whiteboardFork.loadWhiteboardFork();
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, snapshot);
  doc.transact(() => {
    fork.writeAssetLocators(
      doc.getMap(fork.FILES),
      { [fileId]: badLocator },
      { prune: true }
    );
  }, fork.LOCAL_ORIGIN);
  const bytes = Buffer.from(Y.encodeStateAsUpdateV2(doc));
  doc.destroy();
  return bytes;
};

/** Re-encode a stored snapshot with the live image element's `fileId` replaced (sabotage). */
const tamperImageFileId = async (
  snapshot: Uint8Array,
  newFileId: string
): Promise<Uint8Array> => {
  const fork: any = await whiteboardFork.loadWhiteboardFork();
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, snapshot);
  doc.transact(() => {
    for (const [, ymap] of doc.getMap(fork.ELEMENTS).entries()) {
      const map = ymap as Yjs.Map<unknown>;
      if (map.get('type') === 'image') {
        map.set('fileId', newFileId);
      }
    }
  }, fork.LOCAL_ORIGIN);
  const bytes = Buffer.from(Y.encodeStateAsUpdateV2(doc));
  doc.destroy();
  return bytes;
};

/** Decode a stored V2 snapshot and read its FILES asset-locator map via the REAL fork. */
const readStoredAssetLocators = async (
  snapshot: Uint8Array
): Promise<Record<string, string>> => {
  const fork: any = await whiteboardFork.loadWhiteboardFork();
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, snapshot);
  const locators = fork.readAssetLocators(doc.getMap(fork.FILES)) as Record<
    string,
    string
  >;
  doc.destroy();
  return locators;
};

/** Decode a stored V2 snapshot and list its element ids via the REAL fork schema. */
const readStoredElementIds = async (
  snapshot: Uint8Array
): Promise<string[]> => {
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, snapshot);
  const ids = [...doc.getMap('elements').keys()];
  doc.destroy();
  return ids;
};

/**
 * Builds a query-builder mock whose terminal `getRawMany` returns the supplied
 * pages in order (so pagination terminates).
 */
const queryBuilderMock = (pages: any[][]) => {
  let call = 0;
  const qb: any = {
    leftJoin: vi.fn(() => qb),
    select: vi.fn(() => qb),
    addSelect: vi.fn(() => qb),
    orderBy: vi.fn(() => qb),
    // NULL-only reader: `where('contentPointer IS NULL')` + keyset `andWhere`.
    // Keep `where`/`skip`/`take` chainable too so the mock tolerates either style.
    limit: vi.fn(() => qb),
    where: vi.fn(() => qb),
    andWhere: vi.fn(() => qb),
    skip: vi.fn(() => qb),
    take: vi.fn(() => qb),
    getRawMany: vi.fn(async () => pages[call++] ?? []),
  };
  return qb;
};

const collect = async (
  gen: AsyncGenerator<LegacyContentRecord>
): Promise<LegacyContentRecord[]> => {
  const out: LegacyContentRecord[] = [];
  for await (const r of gen) {
    out.push(r);
  }
  return out;
};

describe('CollaborationMigrationService', () => {
  let service: CollaborationMigrationService;
  let memoRepo: { createQueryBuilder: ReturnType<typeof vi.fn> };
  let whiteboardRepo: { createQueryBuilder: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();
    memoRepo = { createQueryBuilder: vi.fn() };
    whiteboardRepo = { createQueryBuilder: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationMigrationService,
        MockWinstonProvider,
        { provide: getRepositoryToken(Memo), useValue: memoRepo },
        { provide: getRepositoryToken(Whiteboard), useValue: whiteboardRepo },
        {
          provide: FileServiceAdapter,
          useValue: {
            createSnapshotInBucket: vi.fn(),
            getContentBatch: vi.fn(),
            deleteDocument: vi.fn(),
            getDocumentContent: vi.fn(),
          },
        },
        { provide: DocumentService, useValue: documentServiceMock() },
        {
          provide: StorageBucketService,
          useValue: storageBucketServiceMock(),
        },
        {
          provide: DocumentAuthorizationService,
          useValue: documentAuthorizationServiceMock(),
        },
      ],
    }).compile();

    service = module.get(CollaborationMigrationService);
  });

  describe('readMemos', () => {
    it('yields memo records as v2 base64 with the storage bucket id', async () => {
      const content = Buffer.from('yjs-v2-bytes');
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([[{ id: 'm1', content, storageBucketId: 'p1' }]])
      );

      const records = await collect(service.readMemos(50));

      expect(records).toEqual([
        {
          id: 'm1',
          contentType: CollaborationContentType.MEMO,
          content: content.toString('base64'),
          storageBucketId: 'p1',
        },
      ]);
    });

    it('yields undefined content for a never-edited memo (NULL content)', async () => {
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([[{ id: 'm2', content: null, storageBucketId: 'p2' }]])
      );

      const records = await collect(service.readMemos(50));

      expect(records[0].content).toBeUndefined();
      expect(records[0].id).toBe('m2');
    });

    it('paginates across full batches without gaps', async () => {
      const page1 = Array.from({ length: 2 }, (_, i) => ({
        id: `m${i}`,
        content: Buffer.from('x'),
        storageBucketId: 'p',
      }));
      const page2 = [
        { id: 'm2', content: Buffer.from('x'), storageBucketId: 'p' },
      ];
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([page1, page2])
      );

      const records = await collect(service.readMemos(2));

      expect(records.map(r => r.id)).toEqual(['m0', 'm1', 'm2']);
    });

    it('terminates on an empty page after a full batch', async () => {
      // batchSize 1, a full first page then an empty page -> exits via the
      // `rows.length === 0` break.
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'm0', content: Buffer.from('x'), storageBucketId: 'p' }],
          [],
        ])
      );

      const records = await collect(service.readMemos(1));

      expect(records.map(r => r.id)).toEqual(['m0']);
    });

    it('returns nothing when there are no memos', async () => {
      memoRepo.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));

      const records = await collect(service.readMemos(50));

      expect(records).toEqual([]);
    });

    it('handles a memo with a null storage bucket id', async () => {
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [
            {
              id: 'm9',
              content: Buffer.from('x'),
              storageBucketId: null,
            },
          ],
        ])
      );

      const records = await collect(service.readMemos(50));

      expect(records[0].storageBucketId).toBeUndefined();
    });
  });

  describe('readWhiteboards', () => {
    it('yields decompressed Excalidraw JSON with the storage bucket id', async () => {
      const json = '{"elements":[],"files":{}}';
      const compressed = await compressText(json);
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'w1', content: compressed, storageBucketId: 'pw' }],
        ])
      );

      const records = await collect(service.readWhiteboards(50));

      expect(records[0]).toEqual({
        id: 'w1',
        contentType: CollaborationContentType.WHITEBOARD,
        storageBucketId: 'pw',
        content: json,
      });
    });

    it('flags a corrupt blob for review instead of dropping it', async () => {
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [
            {
              id: 'w2',
              content: 'not-valid-compressed-@@@',
              storageBucketId: 'pw',
            },
          ],
        ])
      );

      const records = await collect(service.readWhiteboards(50));

      expect(records[0].id).toBe('w2');
      expect(records[0].flagged).toBe(true);
      expect(records[0].content).toBeUndefined();
    });

    it('yields empty content for an empty whiteboard', async () => {
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([[{ id: 'w3', content: '', storageBucketId: 'pw' }]])
      );

      const records = await collect(service.readWhiteboards(50));

      expect(records[0].content).toBe('');
      expect(records[0].flagged).toBeUndefined();
    });

    it('terminates on an empty page after a full batch', async () => {
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'w0', content: '', storageBucketId: 'pw' }],
          [],
        ])
      );

      const records = await collect(service.readWhiteboards(1));

      expect(records.map(r => r.id)).toEqual(['w0']);
    });

    it('handles a null storage bucket id', async () => {
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([[{ id: 'w4', content: '', storageBucketId: null }]])
      );

      const records = await collect(service.readWhiteboards(50));

      expect(records[0].storageBucketId).toBeUndefined();
    });
  });

  describe('readAll', () => {
    it('streams every memo then every whiteboard', async () => {
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'm1', content: Buffer.from('x'), storageBucketId: 'p' }],
        ])
      );
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([[{ id: 'w1', content: '', storageBucketId: 'pw' }]])
      );

      const records = await collect(service.readAll(50));

      expect(records.map(r => r.contentType)).toEqual([
        CollaborationContentType.MEMO,
        CollaborationContentType.WHITEBOARD,
      ]);
    });
  });

  describe('migrateRecord / verifyAll (Release A: NULL-at-source + seed-empty + verify)', () => {
    let svc: CollaborationMigrationService;
    let memo: {
      createQueryBuilder: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    let whiteboard: {
      createQueryBuilder: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    let fileService: {
      createSnapshotInBucket: ReturnType<typeof vi.fn>;
      getContentBatch: ReturnType<typeof vi.fn>;
    };
    let documentService: ReturnType<typeof documentServiceMock>;
    let storageBucketService: ReturnType<typeof storageBucketServiceMock>;
    let documentAuthorizationService: ReturnType<
      typeof documentAuthorizationServiceMock
    >;

    const updateQB = (affected = 1) => {
      const qb: any = {};
      const set = vi.fn(() => qb);
      const where = vi.fn(() => qb);
      const execute = vi.fn(async () => ({ affected }));
      qb.update = vi.fn(() => qb);
      qb.set = set;
      qb.where = where;
      qb.execute = execute;
      return { qb, set, where, execute };
    };
    const verifyQB = (pages: any[][]) => {
      let call = 0;
      const qb: any = {};
      for (const m of [
        'leftJoin',
        'select',
        'addSelect',
        'where',
        'orderBy',
        'limit',
        'andWhere',
      ]) {
        qb[m] = vi.fn(() => qb);
      }
      qb.getRawMany = vi.fn(async () => pages[call++] ?? []);
      return qb;
    };

    beforeEach(async () => {
      vi.restoreAllMocks();
      memo = { createQueryBuilder: vi.fn(), count: vi.fn() };
      whiteboard = { createQueryBuilder: vi.fn(), count: vi.fn() };
      fileService = {
        createSnapshotInBucket: vi.fn(),
        getContentBatch: vi.fn(),
      };
      documentService = documentServiceMock();
      storageBucketService = storageBucketServiceMock();
      documentAuthorizationService = documentAuthorizationServiceMock();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CollaborationMigrationService,
          MockWinstonProvider,
          { provide: getRepositoryToken(Memo), useValue: memo },
          { provide: getRepositoryToken(Whiteboard), useValue: whiteboard },
          { provide: FileServiceAdapter, useValue: fileService },
          { provide: DocumentService, useValue: documentService },
          {
            provide: StorageBucketService,
            useValue: storageBucketService,
          },
          {
            provide: DocumentAuthorizationService,
            useValue: documentAuthorizationService,
          },
        ],
      }).compile();
      svc = module.get(CollaborationMigrationService);

      // No `loadWhiteboardFork` spy: the loader uses `createRequire(__filename)`, which
      // resolves the REAL CJS headless fork under vitest's module runner too — the SAME
      // single `yjs.cjs` instance the service's verifier decodes with and this spec's
      // fixtures build with. Spying it (as an earlier ESM-import workaround did) would both
      // reintroduce the dual-instance split and, under `isolate:false`, leak onto sibling
      // specs.
    });

    it('readMemos filters contentPointer IS NULL at source (NULL-only boundary at the reader)', async () => {
      const qb = queryBuilderMock([[]]);
      memo.createQueryBuilder.mockReturnValue(qb);
      await collect(svc.readMemos(50));
      expect(qb.where).toHaveBeenCalledWith('memo.contentPointer IS NULL');
    });

    it('readWhiteboards filters contentPointer IS NULL at source', async () => {
      const qb = queryBuilderMock([[]]);
      whiteboard.createQueryBuilder.mockReturnValue(qb);
      await collect(svc.readWhiteboards(50));
      expect(qb.where).toHaveBeenCalledWith(
        'whiteboard.contentPointer IS NULL'
      );
    });

    it("seeds a never-edited (NULL-content) memo with the canonical empty snapshot in the RECORD's bucket, with NO per-row metadata SELECT", async () => {
      const update = updateQB();
      memo.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [{ id: 'm1', content: null, storageBucketId: 'sb1' }],
          ])
        )
        .mockReturnValueOnce(update.qb);
      whiteboard.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));
      fileService.createSnapshotInBucket.mockResolvedValue({ id: 'snap-m1' });

      const summary = await svc.migrateAll();

      expect(summary.migrated).toBe(1);
      // Uploads to the record's OWN bucket (carried from the page query), never a
      // second per-document metadata SELECT.
      expect(fileService.createSnapshotInBucket).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sb1'
      );
      // Pointer written only AFTER a successful upload, with the file-service id.
      expect(update.set).toHaveBeenCalledWith({
        contentPointer: 'snap-m1',
        contentVersion: 0,
      });
      // First-writer-wins CAS guard: the UPDATE is conditioned on the pointer
      // still being NULL.
      expect(update.where).toHaveBeenCalledWith(
        'id = :id AND "contentPointer" IS NULL',
        { id: 'm1' }
      );
      expect(update.execute).toHaveBeenCalledTimes(1);
      // Exactly two query builders: the read page + the update. NO per-row meta SELECT.
      expect(memo.createQueryBuilder).toHaveBeenCalledTimes(2);
    });

    it('does NOT overwrite a pointer set by a concurrent writer (CAS affected=0 → failed, no success, file not deleted)', async () => {
      // The `contentPointer IS NULL` guard matches 0 rows: a live collab-service
      // save assigned a newer pointer while this upload was in flight.
      const update = updateQB(0);
      memo.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [{ id: 'm1', content: null, storageBucketId: 'sb1' }],
          ])
        )
        .mockReturnValueOnce(update.qb);
      whiteboard.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));
      fileService.createSnapshotInBucket.mockResolvedValue({ id: 'snap-m1' });

      const summary = await svc.migrateAll();

      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      // The snapshot WAS created (a concurrent writer won), the CAS UPDATE ran and
      // matched nothing, and the stale legacy snapshot is NEVER classified a
      // success. The created file is NOT deleted (it may be deduped/shared).
      expect(fileService.createSnapshotInBucket).toHaveBeenCalledTimes(1);
      expect(update.execute).toHaveBeenCalledTimes(1);
    });

    it('leaves the pointer NULL (failed, rerunnable) when the snapshot upload throws — no update runs', async () => {
      memo.createQueryBuilder.mockReturnValueOnce(
        queryBuilderMock([
          [{ id: 'm1', content: Buffer.from('x'), storageBucketId: 'sb1' }],
        ])
      );
      whiteboard.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));
      fileService.createSnapshotInBucket.mockRejectedValue(
        new Error('file-service down')
      );

      const summary = await svc.migrateAll();

      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      // Only the read page QB was created — the upload threw before the update, so
      // no pointer was written (the row stays NULL / rerunnable).
      expect(memo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('fails a record with no storage bucket (missing bucket fails from the record)', async () => {
      memo.createQueryBuilder.mockReturnValueOnce(
        queryBuilderMock([[{ id: 'm1', content: null, storageBucketId: null }]])
      );
      whiteboard.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));

      const summary = await svc.migrateAll();

      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    // --- Whiteboard legacy-media back-fill (the S2 encoder fix) ---------------
    // Legacy whiteboards store `files` as `{ fileId: BinaryFileData }` (the object
    // carries an Alkemio file-service `url`). The unified schema stores opaque
    // file-service locator STRINGS in the FILES Y.Map, and the fork's
    // `readAssetLocators` is LOUD on non-string values — so a migrated legacy
    // whiteboard whose FILES map held BinaryFileData OBJECTS would throw on read /
    // never resolve its images. These prove the migration writes locator strings.

    // Build a legacy Excalidraw scene JSON with a non-image element + one image
    // element referencing `fileId`, plus a `files` BinaryFileData map.
    const legacyMediaScene = (opts: {
      fileId: string;
      file: Record<string, unknown>;
      withImage?: boolean;
    }): string =>
      JSON.stringify({
        type: 'excalidraw',
        version: 2,
        source: '',
        elements: [
          {
            id: 'rect-1',
            type: 'rectangle',
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            index: 'a0',
          },
          ...(opts.withImage === false
            ? []
            : [
                {
                  id: 'img-1',
                  type: 'image',
                  x: 20,
                  y: 20,
                  width: 30,
                  height: 30,
                  fileId: opts.fileId,
                  index: 'a1',
                },
              ]),
        ],
        appState: {},
        files: { [opts.fileId]: opts.file },
      });

    // Wire a single legacy whiteboard through migrateAll and capture the snapshot
    // buffer handed to file-service. Returns the captured buffer.
    const migrateOneWhiteboard = async (sceneJSON: string) => {
      const compressed = await compressText(sceneJSON);
      const update = updateQB();
      whiteboard.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [{ id: 'w1', content: compressed, storageBucketId: 'sb-w1' }],
          ])
        )
        .mockReturnValueOnce(update.qb);
      memo.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));
      const captured: { buffer?: Uint8Array } = {};
      fileService.createSnapshotInBucket.mockImplementation(
        async (buf: Uint8Array) => {
          captured.buffer = buf;
          return { id: 'snap-w1' };
        }
      );
      const summary = await svc.migrateAll();
      return { summary, captured, update };
    };

    it('CRITICAL: migrates a legacy media whiteboard — FILES holds locator STRINGS (resolved via getDocumentFromURL), never BinaryFileData objects', async () => {
      const url = 'https://alkem.io/api/private/rest/storage/document/DOC-XYZ';
      documentService.getDocumentFromURL.mockResolvedValue({
        id: 'DOC-XYZ',
      } as any);

      const { summary, captured, update } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-abc',
          file: { id: 'file-abc', mimeType: 'image/png', url },
        })
      );

      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.flagged).toBe(0);
      // Resolved the legacy media url to its file-service document id (the locator).
      expect(documentService.getDocumentFromURL).toHaveBeenCalledWith(
        url,
        expect.anything()
      );
      // The stored FILES map holds a locator STRING, read losslessly through the
      // REAL fork — NO loud throw, the exact shape the unified read path expects.
      // (readAssetLocators would THROW here if the map held a BinaryFileData object,
      // which is precisely the pre-fix bug.)
      expect(await readStoredAssetLocators(captured.buffer!)).toEqual({
        'file-abc': 'DOC-XYZ',
      });
      // Discriminating: the raw FILES value is a primitive string, not an object.
      const doc = new Y.Doc();
      Y.applyUpdateV2(doc, captured.buffer!);
      expect(typeof doc.getMap('files').get('file-abc')).toBe('string');
      doc.destroy();
      // The elements survived the conversion (byte-compatible fork doc).
      expect((await readStoredElementIds(captured.buffer!)).sort()).toEqual([
        'img-1',
        'rect-1',
      ]);
      // Written to the record's OWN bucket; pointer set after upload via the CAS.
      expect(fileService.createSnapshotInBucket).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sb-w1'
      );
      expect(update.set).toHaveBeenCalledWith({
        contentPointer: 'snap-w1',
        contentVersion: 0,
      });
    });

    it('preserves the embedded document id for a dangling media ref — valid Alkemio URL, no live row, and NO inline bytes (case 3)', async () => {
      // Explicitly NO dataURL, so this exercises the dangling-id fallback (case 3),
      // not a masked dataURL up-home (case 2).
      documentService.getDocumentFromURL.mockResolvedValue(undefined);

      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            url: 'https://alkem.io/api/private/rest/storage/document/DEAD-DOC',
            // no dataURL
          },
        })
      );

      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      // The reference is preserved by extracting the id embedded in the url, so the
      // asset points exactly where it did pre-006 — never a new crash.
      expect(await readStoredAssetLocators(captured.buffer!)).toEqual({
        'file-1': 'DEAD-DOC',
      });
      // No inline bytes → no up-home occurred (this is genuinely case 3, not a masked case 2).
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
    });

    it('CRITICAL (case 2): a dead Alkemio URL WITH valid inline bytes up-homes the bytes and cold-load resolves them — NOT the dead-doc id', async () => {
      // A legacy descriptor can carry BOTH url AND dataURL (convertLocalFileToRemote keeps
      // dataURL on the uploaded descriptor). If the Alkemio row is gone at migration time but
      // the inline bytes are valid, pre-006 rendered from the bytes — a RECOVERABLE image.
      // Returning the dead-doc id would turn it into an unresolvable locator = data loss.
      documentService.getDocumentFromURL.mockResolvedValue(undefined);
      const expectedBytes = Buffer.from(VALID_PNG_B64, 'base64');

      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            mimeType: 'image/png',
            url: 'https://alkem.io/api/private/rest/storage/document/DEAD-DOC',
            dataURL: VALID_PNG_DATA_URL,
          },
        })
      );

      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      // The inline bytes were up-homed into the TARGET bucket (not the dead-doc id).
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledTimes(1);
      const call =
        storageBucketService.uploadFileAsDocumentFromBuffer.mock.calls[0];
      expect(call[0]).toBe('sb-w1');
      expect(Buffer.from(call[1] as Uint8Array).equals(expectedBytes)).toBe(
        true
      );

      // FILES points at the up-homed id — NEVER the dead-doc id.
      const [uphomedId] = [...storageBucketService.store.keys()];
      const locators = await readStoredAssetLocators(captured.buffer!);
      expect(locators).toEqual({ 'file-1': uphomedId });
      expect(locators['file-1']).not.toBe('DEAD-DOC');

      // Full cold-load chain: image element → FILES locator → bucket resolves to the exact bytes.
      const resolved = await resolveImageFromStore(
        captured.buffer!,
        'file-1',
        storageBucketService.store
      );
      expect(resolved.bucketId).toBe('sb-w1');
      expect(resolved.bytes.equals(expectedBytes)).toBe(true);
    });

    it('FAILS the record when a LIVE image references a non-Alkemio external url that cannot become a locator (no broken migration; pointer stays NULL/rerunnable; no snapshot/CAS)', async () => {
      const { summary, captured, update } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: { id: 'file-1', url: 'https://evil.example.com/x.png' },
        })
      );

      // An external-only url can never become a locator, and a LIVE image references it —
      // migrating would ship a permanently-broken image. Fail instead: pointer stays NULL
      // (the NULL-only worker retries after the operator remediates), no snapshot, no CAS.
      expect(summary.migrated).toBe(0);
      expect(summary.failed).toBe(1);
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
      expect(captured.buffer).toBeUndefined();
      expect(update.set).not.toHaveBeenCalled();
      // Never fetched or stored the external url (SSRF / no-external-locator).
      expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
    });

    it('an UNREFERENCED unsupported file descriptor (no live image) is skipped, and the whiteboard still migrates', async () => {
      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: { id: 'file-1', url: 'https://evil.example.com/x.png' },
          withImage: false,
        })
      );

      // Orphan file entry (no live image references it) → dropped, no broken cold-load.
      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      expect(await readStoredAssetLocators(captured.buffer!)).toEqual({});
    });

    it('CRITICAL (dataURL up-home): the image survives cold-load — element→FILES→bucket resolves to the exact decoded bytes', async () => {
      // The pre-006 upload-failure fallback client-web preserves (convertLocalFilesToRemote
      // / Portal.ts) and the server reupload left stored: files[fileId] = { dataURL, NO url }.
      // Skipping it was SILENT IMAGE LOSS — the exact data-loss class S2 closes. Uses the
      // store-backed bucket mock (no override), so the locator RESOLVES to real bytes.
      const expectedBytes = Buffer.from(VALID_PNG_B64, 'base64');
      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            mimeType: 'image/png',
            dataURL: VALID_PNG_DATA_URL,
          },
        })
      );

      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);

      // The EXACT decoded bytes were up-homed into the TARGET whiteboard bucket (not the
      // base64 text, not a re-encode), with the declared mimeType.
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledTimes(1);
      const call =
        storageBucketService.uploadFileAsDocumentFromBuffer.mock.calls[0];
      expect(call[0]).toBe('sb-w1');
      expect(Buffer.from(call[1] as Uint8Array).equals(expectedBytes)).toBe(
        true
      );
      expect(call[3]).toBe('image/png');

      // (1) The stored snapshot still carries the LIVE image element referencing file-1.
      const fork: any = await whiteboardFork.loadWhiteboardFork();
      const doc = new Y.Doc();
      Y.applyUpdateV2(doc, captured.buffer!);
      let image: Record<string, unknown> | undefined;
      for (const [, ymap] of doc.getMap(fork.ELEMENTS).entries()) {
        const el = fork.yMapToElement(ymap) as Record<string, unknown>;
        if (el.type === 'image') {
          image = el;
        }
      }
      doc.destroy();
      expect(image?.fileId).toBe('file-1');
      expect(image?.isDeleted).not.toBe(true);

      // (2) FILES[file-1] === the up-homed document id (the string locator the bucket keys on).
      const [uphomedId] = [...storageBucketService.store.keys()];
      expect(await readStoredAssetLocators(captured.buffer!)).toEqual({
        'file-1': uphomedId,
      });

      // (3) The FULL cold-load chain: image element → FILES locator → bucket store resolves
      //     to the EXACT decoded bytes in the target bucket.
      const resolved = await resolveImageFromStore(
        captured.buffer!,
        'file-1',
        storageBucketService.store
      );
      expect(resolved.bucketId).toBe('sb-w1');
      expect(resolved.bytes.equals(expectedBytes)).toBe(true);

      // A dataURL asset never touches the url resolver.
      expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
    });

    it('the cold-load chain assertion is DISCRIMINATING — sabotaging the element fileId OR the FILES locator breaks resolution', async () => {
      const { captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            mimeType: 'image/png',
            dataURL: VALID_PNG_DATA_URL,
          },
        })
      );

      // Sanity: the intact chain resolves.
      await expect(
        resolveImageFromStore(
          captured.buffer!,
          'file-1',
          storageBucketService.store
        )
      ).resolves.toBeDefined();

      // Sabotage the FILES locator → points at a doc id absent from the bucket → FAILS.
      const tamperedLocator = await tamperLocator(
        captured.buffer!,
        'file-1',
        'not-in-bucket'
      );
      await expect(
        resolveImageFromStore(
          tamperedLocator,
          'file-1',
          storageBucketService.store
        )
      ).rejects.toThrow();

      // Sabotage the element fileId → no live image references file-1 → FAILS.
      const tamperedElement = await tamperImageFileId(
        captured.buffer!,
        'file-X'
      );
      await expect(
        resolveImageFromStore(
          tamperedElement,
          'file-1',
          storageBucketService.store
        )
      ).rejects.toThrow();
    });

    // --- Up-homed media authorization (readability by the whiteboard's actors) ---
    // The uploaded document starts with a BLANK authorization; without inheriting the
    // target bucket policy the locator resolves to bytes but is UNREADABLE to the
    // whiteboard's legitimate actors (reads/clone authorize against the document's own
    // authorization). These prove the migration applies + persists the TARGET bucket
    // authorization through the ordinary owners, BEFORE the snapshot write / pointer CAS.
    it('CRITICAL (authz): up-homed media inherits + persists the TARGET bucket authorization BEFORE createSnapshot and the pointer CAS', async () => {
      const order: string[] = [];
      const sceneJSON = legacyMediaScene({
        fileId: 'file-1',
        file: {
          id: 'file-1',
          mimeType: 'image/png',
          dataURL: VALID_PNG_DATA_URL,
        },
      });
      const compressed = await compressText(sceneJSON);

      // The target bucket resolves with its (eager) authorization — the parent the
      // up-homed document must inherit.
      storageBucketService.getStorageBucketOrFail.mockResolvedValue({
        id: 'sb-w1',
        authorization: { id: 'bucket-auth' },
      } as any);
      documentAuthorizationService.applyAuthorizationPolicy.mockImplementation(
        async (_doc: any, parent: any) => {
          order.push(`apply:${parent?.id}`);
          // The real service persists the inherited policy INTERNALLY (its own saveAll) and
          // returns [] — the migration awaits it as the SOLE owner, no outer saveAll.
          return [] as any;
        }
      );

      const update = updateQB();
      update.execute.mockImplementation(async () => {
        order.push('cas');
        return { affected: 1 };
      });
      whiteboard.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [{ id: 'w1', content: compressed, storageBucketId: 'sb-w1' }],
          ])
        )
        .mockReturnValueOnce(update.qb);
      memo.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));
      fileService.createSnapshotInBucket.mockImplementation(async () => {
        order.push('createSnapshot');
        return { id: 'snap-w1' };
      });

      const summary = await svc.migrateAll();

      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      // Inherited the TARGET bucket's authorization onto the uploaded document ...
      expect(
        documentAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
        expect.objectContaining({ id: 'bucket-auth' })
      );
      // ... and (persisting the inherited policy internally as the SOLE owner) runs
      // strictly BEFORE the snapshot write and the pointer CAS.
      expect(order).toEqual(['apply:bucket-auth', 'createSnapshot', 'cas']);
    });

    it('an authorization APPLY failure leaves the record unmigrated (re-runnable) — no snapshot, no pointer', async () => {
      storageBucketService.getStorageBucketOrFail.mockResolvedValue({
        id: 'sb-w1',
        authorization: { id: 'bucket-auth' },
      } as any);
      documentAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
        new Error('apply failed')
      );

      const { summary } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            mimeType: 'image/png',
            dataURL: 'data:image/png;base64,AAAA',
          },
        })
      );

      // An unreadable locator is never written: the record fails (re-runnable), no snapshot.
      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('up-homes dataURL bytes when the url is a non-Alkemio external url (external url unusable → inline bytes win)', async () => {
      storageBucketService.uploadFileAsDocumentFromBuffer.mockResolvedValue({
        id: 'UPHOMED-DOC2',
      } as any);

      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            mimeType: 'image/png',
            url: 'https://evil.example.com/x.png',
            dataURL: 'data:image/png;base64,AAAA',
          },
        })
      );

      expect(summary.migrated).toBe(1);
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledTimes(1);
      expect(await readStoredAssetLocators(captured.buffer!)).toEqual({
        'file-1': 'UPHOMED-DOC2',
      });
    });

    it('FAILS the record when a LIVE image references a descriptor with no usable url and no inline bytes (unrepresentable live media blocks the row, not a broken migration)', async () => {
      const { summary, captured, update } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: { id: 'file-1', mimeType: 'image/png' },
        })
      );

      // The image bytes are unrecoverable (no url, no dataURL) and a LIVE image references
      // it → fail the row (blocks Release B until remediated) rather than migrate a broken
      // image. No up-home, no snapshot, no CAS; pointer stays NULL/rerunnable.
      expect(summary.migrated).toBe(0);
      expect(summary.failed).toBe(1);
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
      expect(captured.buffer).toBeUndefined();
      expect(update.set).not.toHaveBeenCalled();
    });

    it('an UNREFERENCED descriptor with no usable url and no bytes (no live image) is skipped, still migrating', async () => {
      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: { id: 'file-1', mimeType: 'image/png' },
          withImage: false,
        })
      );

      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      expect(await readStoredAssetLocators(captured.buffer!)).toEqual({});
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
    });

    it('fails the record (re-runnable) when up-homing dataURL bytes throws — never a silent drop', async () => {
      storageBucketService.uploadFileAsDocumentFromBuffer.mockRejectedValue(
        new Error('file-service down')
      );

      const { summary } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            mimeType: 'image/png',
            dataURL: 'data:image/png;base64,AAAA',
          },
        })
      );

      // A real upload failure fails the whole record (re-runnable) rather than
      // silently dropping the image and marking the row migrated.
      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
    });

    // --- Release-A migration WRITE-PATH guards: planning builds a REPRESENTABLE snapshot with
    // ZERO writes, then verifyContent rejects a malformed scene, an unrepresentable live image,
    // a malformed-base64 dataURL, an unknown element type, or a corrupt memo BEFORE any upload
    // or pointer CAS (pointer stays NULL / re-runnable). ---

    // Wire one legacy whiteboard row for a DRY-RUN (no second update QB — dry-run never writes
    // a pointer), then run migrateAll in preview mode.
    const dryRunOneWhiteboard = async (sceneJSON: string) => {
      const compressed = await compressText(sceneJSON);
      whiteboard.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'w1', content: compressed, storageBucketId: 'sb-w1' }],
        ])
      );
      memo.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));
      return svc.migrateAll({ dryRun: true });
    };

    // Assert the migration touched NO side-effect surface: no snapshot upload, no dataURL
    // up-home, no up-home authorization, and no Alkemio-document DB lookup. (The pointer CAS is
    // asserted per-test via its own update QB where one is wired.)
    const expectNoMigrationWrites = () => {
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
      expect(
        documentAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
      expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
    };

    it('dry-run: a LIVE image referencing an external-only url (no inline bytes) is UNREPRESENTABLE → failed in planning, ZERO writes', async () => {
      const summary = await dryRunOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-x',
          file: {
            id: 'file-x',
            mimeType: 'image/png',
            url: 'https://evil.example.com/x.png',
          },
        })
      );
      expect(summary.dryRun).toBe(true);
      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expectNoMigrationWrites();
    });

    it('dry-run: a LIVE image with a decodable inline dataURL is representable → planned/migrated, ZERO writes', async () => {
      const summary = await dryRunOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-x',
          file: {
            id: 'file-x',
            mimeType: 'image/png',
            dataURL: VALID_PNG_DATA_URL,
          },
        })
      );
      expect(summary.dryRun).toBe(true);
      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      expectNoMigrationWrites();
    });

    it('dry-run: a LIVE image dataURL with MALFORMED base64 padding (TQ=) → unrepresentable → failed, ZERO writes (strict base64)', async () => {
      const summary = await dryRunOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-x',
          file: {
            id: 'file-x',
            mimeType: 'image/png',
            dataURL: 'data:image/png;base64,TQ=',
          },
        })
      );
      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expectNoMigrationWrites();
    });

    it('dry-run: a LIVE image dataURL with VALID UNPADDED base64 (TWE) is representable → planned/migrated, ZERO writes', async () => {
      const summary = await dryRunOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-x',
          file: {
            id: 'file-x',
            mimeType: 'application/octet-stream',
            dataURL: 'data:application/octet-stream;base64,TWE',
          },
        })
      );
      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      expectNoMigrationWrites();
    });

    it('dry-run: a LIVE image dataURL whose base64 marker is a MALFORMED token (;base64junk) → unrepresentable → failed, ZERO writes', async () => {
      const summary = await dryRunOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-x',
          file: {
            id: 'file-x',
            mimeType: 'image/png',
            // ';base64junk' is NOT the exact ';base64' flag — it must be rejected, never
            // silently decoded as literal ASCII.
            dataURL: 'data:image/png;base64junk,TWE',
          },
        })
      );
      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expectNoMigrationWrites();
    });

    it('dry-run: a LIVE image dataURL with an ordinary param BEFORE the exact base64 flag (;charset=utf-8;base64) is representable → planned/migrated, ZERO writes', async () => {
      const summary = await dryRunOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-x',
          file: {
            id: 'file-x',
            mimeType: 'image/png',
            dataURL: 'data:image/png;charset=utf-8;base64,TWE',
          },
        })
      );
      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      expectNoMigrationWrites();
    });

    it('migrate (real): a LIVE image dataURL with MALFORMED base64 → failed, pointer stays NULL, ZERO upload/authz/snapshot/CAS', async () => {
      const compressed = await compressText(
        legacyMediaScene({
          fileId: 'file-x',
          file: {
            id: 'file-x',
            mimeType: 'image/png',
            dataURL: 'data:image/png;base64,TQ=',
          },
        })
      );
      const update = updateQB();
      whiteboard.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [{ id: 'w1', content: compressed, storageBucketId: 'sb-w1' }],
          ])
        )
        .mockReturnValueOnce(update.qb);
      memo.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));

      const summary = await svc.migrateAll();

      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      // Rejected in PLANNING → no up-home upload, no up-home authz, no snapshot, and the
      // pointer CAS never runs (stays NULL / re-runnable).
      expectNoMigrationWrites();
      expect(update.set).not.toHaveBeenCalled();
    });

    it('migrate: a MALFORMED nonempty scene (unparseable JSON) → failed, ZERO writes (never silently emptied)', async () => {
      const compressed = await compressText('{ not valid json');
      const update = updateQB();
      whiteboard.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [{ id: 'w1', content: compressed, storageBucketId: 'sb-w1' }],
          ])
        )
        .mockReturnValueOnce(update.qb);
      memo.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));

      const summary = await svc.migrateAll();

      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
      expect(update.set).not.toHaveBeenCalled();
    });

    it('migrate: a valid-JSON scene whose elements is NOT an array → failed, ZERO writes', async () => {
      const compressed = await compressText(
        JSON.stringify({ type: 'excalidraw', elements: 'nope', appState: {} })
      );
      const update = updateQB();
      whiteboard.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [{ id: 'w1', content: compressed, storageBucketId: 'sb-w1' }],
          ])
        )
        .mockReturnValueOnce(update.qb);
      memo.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));

      const summary = await svc.migrateAll();

      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('migrate: an UNKNOWN element type in the legacy scene → failed, ZERO writes (verifyContent rejects before upload)', async () => {
      const compressed = await compressText(
        JSON.stringify({
          type: 'excalidraw',
          version: 2,
          source: '',
          elements: [
            {
              id: 'bad-1',
              type: 'garbage',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              index: 'a0',
            },
          ],
          appState: {},
          files: {},
        })
      );
      const update = updateQB();
      whiteboard.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [{ id: 'w1', content: compressed, storageBucketId: 'sb-w1' }],
          ])
        )
        .mockReturnValueOnce(update.qb);
      memo.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));

      const summary = await svc.migrateAll();

      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('migrate: a memo whose stored content decodes to invalid schema → failed, NO pointer (planning rejects before any write)', async () => {
      const update = updateQB();
      memo.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilderMock([
            [
              {
                id: 'm1',
                content: Buffer.from([1, 2, 3, 4, 5]),
                storageBucketId: 'sb-m1',
              },
            ],
          ])
        )
        .mockReturnValueOnce(update.qb);
      whiteboard.createQueryBuilder.mockReturnValue(queryBuilderMock([[]]));

      const summary = await svc.migrateAll();

      expect(summary.failed).toBe(1);
      expect(summary.migrated).toBe(0);
      expect(fileService.createSnapshotInBucket).not.toHaveBeenCalled();
      expect(update.set).not.toHaveBeenCalled();
    });

    // --- verifyAll snapshot builders. The fork is the REAL CJS headless fork (via
    // loadWhiteboardFork) and this spec's `Y` is the matching `yjs.cjs`, so the decoded doc +
    // fork Scene share the one instance the service's verifier uses — no spy, no split. ---
    const b64 = (u8: Uint8Array) => Buffer.from(u8).toString('base64');
    const memoB64 = (md: string) => b64(markdownToYjsV2State(md));
    const wbFork = () => whiteboardFork.loadWhiteboardFork() as Promise<any>;
    const oneMemoRow = (contentBase64: string | undefined, found = true) => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([[{ id: 'm1', contentPointer: 'p1', storageBucketId: 'b1' }]])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      fileService.getContentBatch.mockResolvedValue([
        { id: 'p1', found, contentBase64 },
      ]);
    };
    const oneWbRow = (contentBase64: string) => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      whiteboard.createQueryBuilder.mockReturnValue(
        verifyQB([[{ id: 'w1', contentPointer: 'p1', storageBucketId: 'b1' }]])
      );
      fileService.getContentBatch.mockResolvedValue([
        { id: 'p1', found: true, contentBase64 },
      ]);
    };

    it('verifyAll: ok when zero NULL pointers and every pointer resolves + decodes', async () => {
      oneMemoRow(memoB64('hello **world**'));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(true);
      expect(summary.nullPointerTotal).toBe(0);
      expect(summary.pointersChecked).toBe(1);
      expect(summary.unresolved).toEqual([]);
      expect(summary.invalid).toEqual([]);
    });

    it('verifyAll: NOT ok when a pointer does not resolve in file-service (with a reason)', async () => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([[{ id: 'm1', contentPointer: 'p1', storageBucketId: 'b1' }]])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      fileService.getContentBatch.mockResolvedValue([
        { id: 'p1', found: false },
      ]);

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.unresolved).toContainEqual({
        id: 'm1',
        contentType: CollaborationContentType.MEMO,
        contentPointer: 'p1',
        reason: expect.stringContaining('not found'),
      });
    });

    it('verifyAll: NOT ok when a NULL pointer remains', async () => {
      memo.count.mockResolvedValue(2);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.nullPointerTotal).toBe(2);
      expect(summary.memoNullPointers).toBe(2);
    });

    it('verifyAll resolves ONE pointer per file-service call — never a whole page as one getContentBatch request', async () => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([
          [
            { id: 'm1', contentPointer: 'p1', storageBucketId: 'b1' },
            { id: 'm2', contentPointer: 'p2', storageBucketId: 'b1' },
          ],
        ])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      fileService.getContentBatch.mockImplementation(async (ids: string[]) => [
        { id: ids[0], found: true, contentBase64: memoB64('x') },
      ]);

      const summary = await svc.verifyAll();

      expect(summary.pointersChecked).toBe(2);
      // Two pointers in one DB page -> two separate single-id content requests,
      // never one 2-id (potentially multi-hundred-MiB) request.
      expect(fileService.getContentBatch).toHaveBeenCalledTimes(2);
      expect(fileService.getContentBatch).toHaveBeenNthCalledWith(1, ['p1']);
      expect(fileService.getContentBatch).toHaveBeenNthCalledWith(2, ['p2']);
      expect(summary.ok).toBe(true);
    });

    // --- Enhanced decode/schema validation (Release-A verifier) ---

    it('verify: a valid non-empty whiteboard snapshot passes', async () => {
      const fork = await wbFork();
      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });
      scene.insertElement(
        fork.newElement({
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        })
      );
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(true);
      expect(summary.invalid).toEqual([]);
    });

    it('verify: a canonical empty whiteboard snapshot passes', async () => {
      oneWbRow(b64(await whiteboardSceneToYjsV2State('', {})));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(true);
      expect(summary.invalid).toEqual([]);
    });

    it('verify: corrupt snapshot bytes → invalid (never ok)', async () => {
      oneMemoRow(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]).toString('base64'));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid).toHaveLength(1);
      expect(summary.invalid[0]).toMatchObject({
        id: 'm1',
        contentType: CollaborationContentType.MEMO,
        contentPointer: 'p1',
      });
      expect(summary.invalid[0].reason).toBeTruthy();
    });

    it('verify: found but no contentBase64 → invalid (found without content)', async () => {
      oneMemoRow(undefined);

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(
        /no valid content|missing contentBase64/i
      );
    });

    it('verify: a snapshot pointer whose contentBase64 DECODES to zero bytes (====) → invalid (never a valid snapshot)', async () => {
      // '====' is a non-empty string that base64-decodes to zero bytes — a migrated snapshot is
      // never empty, so the pointer content itself must be rejected (not just live media).
      oneMemoRow('====');

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid).toHaveLength(1);
      expect(summary.invalid[0].reason).toMatch(
        /zero bytes|malformed|no valid content/i
      );
    });

    it('verify: a snapshot pointer whose contentBase64 is non-alphabet JUNK (not-base64!!!) → invalid (strict decode before Yjs)', async () => {
      // A lenient Buffer.from would decode 'not-base64!!!' to 7 junk bytes and hand them to Yjs;
      // the strict decoder rejects it as the pointer-content owner, before any Yjs decode.
      oneMemoRow('not-base64!!!');

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid).toHaveLength(1);
      expect(summary.invalid[0].reason).toMatch(/no valid content|malformed/i);
    });

    it('verify: a snapshot getContentBatch echoing a DIFFERENT id than the requested pointer → invalid (wrong-object bytes rejected)', async () => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([[{ id: 'm1', contentPointer: 'p1', storageBucketId: 'b1' }]])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      // file-service resolves, but echoes a different id than the requested pointer 'p1'.
      fileService.getContentBatch.mockResolvedValue([
        { id: 'WRONG-P', found: true, contentBase64: memoB64('x') },
      ]);

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      const reason = summary.invalid[0].reason;
      expect(reason).toMatch(/different id/);
      expect(reason).toContain('p1'); // requested pointer
      expect(reason).toContain('WRONG-P'); // returned id
    });

    it('verify: a getContentBatch throw → invalid with reason; the run continues to the next row', async () => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([
          [
            { id: 'm1', contentPointer: 'p1', storageBucketId: 'b1' },
            { id: 'm2', contentPointer: 'p2', storageBucketId: 'b1' },
          ],
        ])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      fileService.getContentBatch.mockImplementation(async (ids: string[]) => {
        if (ids[0] === 'p1') throw new Error('file-service down');
        return [{ id: ids[0], found: true, contentBase64: memoB64('ok') }];
      });

      const summary = await svc.verifyAll();

      expect(summary.pointersChecked).toBe(2); // m2 still verified after m1 threw
      expect(summary.invalid).toHaveLength(1);
      expect(summary.invalid[0].id).toBe('m1');
      expect(summary.invalid[0].reason).toMatch(/file-service down/);
      expect(summary.ok).toBe(false);
    });

    it('verify: a non-null-pointer row whose owner has NO storage bucket → invalid, never fetched; next row still verifies', async () => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([
          [
            { id: 'm1', contentPointer: 'p1', storageBucketId: null },
            { id: 'm2', contentPointer: 'p2', storageBucketId: 'b1' },
          ],
        ])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      fileService.getContentBatch.mockResolvedValue([
        { id: 'p2', found: true, contentBase64: memoB64('ok') },
      ]);

      const summary = await svc.verifyAll();

      expect(summary.invalid).toContainEqual(
        expect.objectContaining({
          id: 'm1',
          reason: expect.stringContaining('no storage bucket'),
        })
      );
      // The bucketless row is never fetched; the healthy row is.
      expect(fileService.getContentBatch).not.toHaveBeenCalledWith(['p1']);
      expect(fileService.getContentBatch).toHaveBeenCalledWith(['p2']);
      expect(summary.ok).toBe(false);
    });

    it('verify: a blank/whitespace contentPointer → invalid, never fetched', async () => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([[{ id: 'm1', contentPointer: '   ', storageBucketId: 'b1' }]])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));

      const summary = await svc.verifyAll();

      expect(summary.invalid).toContainEqual(
        expect.objectContaining({
          id: 'm1',
          reason: expect.stringContaining('blank'),
        })
      );
      expect(fileService.getContentBatch).not.toHaveBeenCalled();
      expect(summary.ok).toBe(false);
    });

    it('verify: a memo with a non-canonical (unknown/missing default) root → invalid', async () => {
      const doc = new Y.Doc();
      doc.getXmlFragment('other').insert(0, [new Y.XmlText('x')]);
      oneMemoRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/root/);
    });

    it('verify: a whiteboard with an unknown top-level root → invalid', async () => {
      const doc = new Y.Doc();
      doc.getMap('bogus').set('k', 'v');
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/unknown top-level root/);
    });

    it('verify: a whiteboard FILES map with a non-string locator → invalid', async () => {
      const doc = new Y.Doc();
      doc.getMap('files').set('f1', 123);
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid).toHaveLength(1);
    });

    it('verify: a whiteboard appState with a non-allow-list key → invalid', async () => {
      const doc = new Y.Doc();
      doc.getMap('appState').set('evil', 'x');
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/appState/);
    });

    it('verify: a whiteboard appState allow-list key with a non-string value → invalid', async () => {
      const doc = new Y.Doc();
      doc.getMap('appState').set('name', 123);
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/must be a string/);
    });

    it('verify: a whiteboard deletion marker that is negative → invalid', async () => {
      const doc = new Y.Doc();
      doc.getMap('elementDeletions').set('e1', -5);
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/deletion marker/);
    });

    it('verify: a whiteboard LIVE image element whose fileId has no file-map locator → invalid (cold-load integrity)', async () => {
      const fork = await wbFork();
      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });
      const img = fork.newElement({
        type: 'image',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
      scene.insertElement(img);
      // newElement does not carry fileId; set it on the stored element map so the
      // materialized element is a LIVE image referencing a fileId with no FILES entry.
      (doc.getMap(fork.ELEMENTS).get(img.id) as any).set(
        'fileId',
        'missing-file'
      );
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/live image/);
    });

    it('verify: a DELETED image element with no locator is exempt (passes)', async () => {
      const fork = await wbFork();
      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });
      const img = fork.newElement({
        type: 'image',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
      scene.insertElement(img);
      const ymap = doc.getMap(fork.ELEMENTS).get(img.id) as any;
      ymap.set('fileId', 'gone'); // references a fileId with no locator ...
      ymap.set('isDeleted', true); // ... but a DELETED image is exempt from the invariant.
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(true);
      expect(summary.invalid).toEqual([]);
    });

    // --- Live-image BYTE-resolution gate + element-schema REDs ---

    // Build a whiteboard snapshot with one LIVE image whose fileId maps, in FILES, to
    // `locator` (a well-formed string → passes SCHEMA; the byte gate resolves it separately).
    const liveImageWhiteboard = async (fileId: string, locator: string) => {
      const fork = await wbFork();
      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });
      const img = fork.newElement({
        type: 'image',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
      scene.insertElement(img);
      (doc.getMap(fork.ELEMENTS).get(img.id) as any).set('fileId', fileId);
      doc.transact(() => {
        fork.writeAssetLocators(
          doc.getMap(fork.FILES),
          { [fileId]: locator },
          { prune: true }
        );
      }, fork.LOCAL_ORIGIN);
      const snapshot = b64(Y.encodeStateAsUpdateV2(doc));
      doc.destroy();
      return snapshot;
    };

    // Wire a single whiteboard row whose pointer 'p1' resolves to `snapshot`, and route every
    // OTHER (live-image locator) content request through `media`.
    const wbRowWithMedia = (
      snapshot: string,
      media: (id: string) => {
        id: string;
        found: boolean;
        contentBase64?: string;
      }
    ) => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      whiteboard.createQueryBuilder.mockReturnValue(
        verifyQB([[{ id: 'w1', contentPointer: 'p1', storageBucketId: 'b1' }]])
      );
      fileService.getContentBatch.mockImplementation(async (ids: string[]) =>
        ids[0] === 'p1'
          ? [{ id: 'p1', found: true, contentBase64: snapshot }]
          : [media(ids[0])]
      );
    };

    it('verify: a LIVE image whose well-formed FILES locator does NOT resolve in file-service → invalid (byte gate; reason names element/file/locator)', async () => {
      wbRowWithMedia(await liveImageWhiteboard('file-1', 'loc-1'), id => ({
        id,
        found: false,
      }));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid).toHaveLength(1);
      expect(summary.invalid[0]).toMatchObject({
        id: 'w1',
        contentPointer: 'p1',
      });
      expect(summary.invalid[0].reason).toMatch(/live image/);
      expect(summary.invalid[0].reason).toContain('loc-1');
      // exactly two content calls: the snapshot pointer, then the one unique live locator.
      expect(fileService.getContentBatch).toHaveBeenCalledTimes(2);
      expect(fileService.getContentBatch).toHaveBeenNthCalledWith(1, ['p1']);
      expect(fileService.getContentBatch).toHaveBeenNthCalledWith(2, ['loc-1']);
    });

    it('verify: a LIVE image whose locator resolves to NON-EMPTY bytes passes (resolvability only — byte IDENTITY is proven by the migrate up-home tests, not here)', async () => {
      wbRowWithMedia(await liveImageWhiteboard('file-1', 'loc-1'), id => ({
        id,
        found: true,
        contentBase64: VALID_PNG_B64,
      }));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(true);
      expect(summary.invalid).toEqual([]);
      expect(fileService.getContentBatch).toHaveBeenCalledTimes(2);
      expect(fileService.getContentBatch).toHaveBeenNthCalledWith(2, ['loc-1']);
    });

    it('verify: two LIVE images with DIFFERENT fileIds mapping to ONE locator are DEDUPED BY LOCATOR to a single media fetch', async () => {
      const fork = await wbFork();
      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });
      const imgA = fork.newElement({
        type: 'image',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
      const imgB = fork.newElement({
        type: 'image',
        x: 20,
        y: 20,
        width: 10,
        height: 10,
      });
      scene.insertElement(imgA);
      scene.insertElement(imgB);
      // DISTINCT fileIds that both resolve to the SAME locator — so a (wrong) fileId-based
      // dedupe would still fetch twice; only LOCATOR-based dedupe collapses to one fetch.
      (doc.getMap(fork.ELEMENTS).get(imgA.id) as any).set('fileId', 'file-a');
      (doc.getMap(fork.ELEMENTS).get(imgB.id) as any).set('fileId', 'file-b');
      doc.transact(() => {
        fork.writeAssetLocators(
          doc.getMap(fork.FILES),
          { 'file-a': 'loc-1', 'file-b': 'loc-1' },
          { prune: true }
        );
      }, fork.LOCAL_ORIGIN);
      const snapshot = b64(Y.encodeStateAsUpdateV2(doc));
      doc.destroy();
      wbRowWithMedia(snapshot, id => ({
        id,
        found: true,
        contentBase64: VALID_PNG_B64,
      }));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(true);
      // snapshot + EXACTLY ONE media fetch — the shared locator resolves once across BOTH
      // distinct-fileId images (locator-set dedupe, not fileId-set).
      expect(fileService.getContentBatch).toHaveBeenCalledTimes(2);
      expect(fileService.getContentBatch).toHaveBeenNthCalledWith(2, ['loc-1']);
    });

    it('verify: a media getContentBatch THROW → invalid naming the element, file, and locator (not a bare error)', async () => {
      wbRowWithMedia(await liveImageWhiteboard('file-1', 'loc-1'), () => {
        throw new Error('file-service unreachable');
      });

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid).toHaveLength(1);
      const reason = summary.invalid[0].reason;
      // all three identifiers survive the thrown media fetch, plus the underlying cause.
      expect(reason).toMatch(/live image '[^']+'/); // a non-empty elementId
      expect(reason).toContain('file-1'); // the fileId
      expect(reason).toContain('loc-1'); // the locator
      expect(reason).toContain('file-service unreachable'); // the cause
    });

    it('verify: a LIVE image whose media contentBase64 is non-alphabet JUNK (not-base64!!!) → invalid (strict decode; a lenient Buffer would false-green 7 junk bytes)', async () => {
      wbRowWithMedia(await liveImageWhiteboard('file-1', 'loc-1'), id => ({
        id,
        found: true,
        contentBase64: 'not-base64!!!',
      }));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/malformed or empty base64/);
    });

    it('verify: a media response whose echoed id does NOT match the requested locator → invalid (wrong-object bytes rejected)', async () => {
      wbRowWithMedia(await liveImageWhiteboard('file-1', 'loc-1'), () => ({
        id: 'WRONG-LOCATOR',
        found: true,
        contentBase64: VALID_PNG_B64,
      }));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      const reason = summary.invalid[0].reason;
      expect(reason).toMatch(/different id/);
      expect(reason).toContain('loc-1'); // requested locator
      expect(reason).toContain('WRONG-LOCATOR'); // returned id
    });

    it('verify: a LIVE image whose media locator resolves but DECODES to zero bytes (====) → invalid', async () => {
      wbRowWithMedia(await liveImageWhiteboard('file-1', 'loc-1'), id => ({
        id,
        found: true,
        contentBase64: '====',
      }));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/malformed or empty base64/);
    });

    it('verify: a DELETED image + an UNREFERENCED FILES entry issue ZERO media fetches beyond the snapshot', async () => {
      const fork = await wbFork();
      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });
      const img = fork.newElement({
        type: 'image',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
      scene.insertElement(img);
      const ymap = doc.getMap(fork.ELEMENTS).get(img.id) as any;
      ymap.set('fileId', 'file-del');
      ymap.set('isDeleted', true); // deleted → never enumerated
      doc.transact(() => {
        // a locator for the deleted image AND an entirely unreferenced entry.
        fork.writeAssetLocators(
          doc.getMap(fork.FILES),
          { 'file-del': 'loc-del', 'file-orphan': 'loc-orphan' },
          { prune: true }
        );
      }, fork.LOCAL_ORIGIN);
      const snapshot = b64(Y.encodeStateAsUpdateV2(doc));
      doc.destroy();
      wbRowWithMedia(snapshot, id => ({ id, found: false }));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(true);
      expect(summary.invalid).toEqual([]);
      // ONLY the snapshot pointer is fetched — no media call for a deleted / unreferenced ref.
      expect(fileService.getContentBatch).toHaveBeenCalledTimes(1);
      expect(fileService.getContentBatch).toHaveBeenCalledWith(['p1']);
    });

    it('verify: an element with an UNKNOWN type (garbage) → invalid (cold-load-critical schema)', async () => {
      const fork = await wbFork();
      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });
      const rect = fork.newElement({
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
      scene.insertElement(rect);
      (doc.getMap(fork.ELEMENTS).get(rect.id) as any).set('type', 'garbage');
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(
        /not a valid Excalidraw element/
      );
    });

    it.each([
      { label: 'a number', fileId: 123 },
      { label: 'an empty string (even with FILES[""] present)', fileId: '' },
    ])('verify: a LIVE image whose fileId is $label → invalid (rejected before enumeration casts it)', async ({
      fileId,
    }) => {
      const fork = await wbFork();
      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });
      const img = fork.newElement({
        type: 'image',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
      scene.insertElement(img);
      (doc.getMap(fork.ELEMENTS).get(img.id) as any).set('fileId', fileId);
      if (fileId === '') {
        // an empty-string fileId paired with a FILES[''] locator must STILL be rejected.
        doc.transact(() => {
          fork.writeAssetLocators(
            doc.getMap(fork.FILES),
            { '': 'loc-empty' },
            { prune: true }
          );
        }, fork.LOCAL_ORIGIN);
      }
      oneWbRow(b64(Y.encodeStateAsUpdateV2(doc)));

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(false);
      expect(summary.invalid[0].reason).toMatch(/non-string or empty fileId/);
    });
  });
});
