import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { compressText } from '@common/utils/compression.util';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Memo } from '@domain/common/memo/memo.entity';
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
import * as Y from 'yjs';
import { CollaborationMigrationService } from './collaboration-migration.service';
import { LegacyContentRecord } from './legacy.content.record';

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

/** `AuthorizationPolicyService` stub — persists the authorizations `applyAuthorizationPolicy` returns. */
const authorizationPolicyServiceMock = () => ({
  saveAll: vi.fn(async (_authorizations: any) => undefined),
});

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
  const fork: any = await import('@excalidraw-yjs/element/headless');
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
  const fork: any = await import('@excalidraw-yjs/element/headless');
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
  const fork: any = await import('@excalidraw-yjs/element/headless');
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, snapshot);
  doc.transact(() => {
    for (const [, ymap] of doc.getMap(fork.ELEMENTS).entries()) {
      const map = ymap as Y.Map<unknown>;
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
  const fork: any = await import('@excalidraw-yjs/element/headless');
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
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyServiceMock(),
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
    let authorizationPolicyService: ReturnType<
      typeof authorizationPolicyServiceMock
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
      authorizationPolicyService = authorizationPolicyServiceMock();
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
          {
            provide: AuthorizationPolicyService,
            useValue: authorizationPolicyService,
          },
        ],
      }).compile();
      svc = module.get(CollaborationMigrationService);

      // The fork-based whiteboard encoder loads the ESM headless fork via a
      // Function-wrapped dynamic import vitest's module runner cannot drive; spy the
      // shared export and substitute a plain dynamic import so the migration
      // exercises the REAL fork (structurally identical to editor/collab-service docs).
      vi.spyOn(whiteboardFork, 'loadWhiteboardFork').mockImplementation(
        () => import('@excalidraw-yjs/element/headless') as any
      );
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
      const expectedBytes = Buffer.from('iVBORw0KGgo=', 'base64');

      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            mimeType: 'image/png',
            url: 'https://alkem.io/api/private/rest/storage/document/DEAD-DOC',
            dataURL: 'data:image/png;base64,iVBORw0KGgo=',
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

    it('skips a non-Alkemio external media url and still migrates the whiteboard', async () => {
      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: { id: 'file-1', url: 'https://evil.example.com/x.png' },
        })
      );

      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      // A non-Alkemio url can never become an opaque file-service locator → dropped.
      expect(await readStoredAssetLocators(captured.buffer!)).toEqual({});
      // Never consulted the DB resolver for a non-Alkemio url.
      expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
    });

    it('CRITICAL (dataURL up-home): the image survives cold-load — element→FILES→bucket resolves to the exact decoded bytes', async () => {
      // The pre-006 upload-failure fallback client-web preserves (convertLocalFilesToRemote
      // / Portal.ts) and the server reupload left stored: files[fileId] = { dataURL, NO url }.
      // Skipping it was SILENT IMAGE LOSS — the exact data-loss class S2 closes. Uses the
      // store-backed bucket mock (no override), so the locator RESOLVES to real bytes.
      const expectedBytes = Buffer.from('iVBORw0KGgo=', 'base64');
      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: {
            id: 'file-1',
            mimeType: 'image/png',
            dataURL: 'data:image/png;base64,iVBORw0KGgo=',
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
      const fork: any = await import('@excalidraw-yjs/element/headless');
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
            dataURL: 'data:image/png;base64,iVBORw0KGgo=',
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
          dataURL: 'data:image/png;base64,iVBORw0KGgo=',
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
          return [{ id: 'doc-auth' }] as any;
        }
      );
      authorizationPolicyService.saveAll.mockImplementation(
        async (auths: any) => {
          order.push(`saveAll:${auths?.[0]?.id}`);
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
      // ... and persisted every returned authorization ...
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([
        { id: 'doc-auth' },
      ]);
      // ... BOTH strictly BEFORE the snapshot write and the pointer CAS.
      expect(order).toEqual([
        'apply:bucket-auth',
        'saveAll:doc-auth',
        'createSnapshot',
        'cas',
      ]);
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

    it('an authorization SAVE-ALL failure leaves the record unmigrated (re-runnable) — no snapshot, no pointer', async () => {
      storageBucketService.getStorageBucketOrFail.mockResolvedValue({
        id: 'sb-w1',
        authorization: { id: 'bucket-auth' },
      } as any);
      authorizationPolicyService.saveAll.mockRejectedValue(
        new Error('saveAll failed')
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

    it('skips an asset with no usable url and no inline bytes, still migrating the whiteboard', async () => {
      const { summary, captured } = await migrateOneWhiteboard(
        legacyMediaScene({
          fileId: 'file-1',
          file: { id: 'file-1', mimeType: 'image/png' },
        })
      );

      expect(summary.migrated).toBe(1);
      expect(summary.failed).toBe(0);
      // Nothing to up-home (no bytes) and no Alkemio url → dropped + surfaced, never a crash.
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

    it('verifyAll: ok when zero NULL pointers and every pointer resolves', async () => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([[{ id: 'm1', contentPointer: 'p1' }]])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      fileService.getContentBatch.mockResolvedValue([
        { id: 'p1', found: true },
      ]);

      const summary = await svc.verifyAll();

      expect(summary.ok).toBe(true);
      expect(summary.nullPointerTotal).toBe(0);
      expect(summary.pointersChecked).toBe(1);
      expect(summary.unresolved).toEqual([]);
    });

    it('verifyAll: NOT ok when a pointer does not resolve in file-service', async () => {
      memo.count.mockResolvedValue(0);
      whiteboard.count.mockResolvedValue(0);
      memo.createQueryBuilder.mockReturnValue(
        verifyQB([[{ id: 'm1', contentPointer: 'p1' }]])
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
            { id: 'm1', contentPointer: 'p1' },
            { id: 'm2', contentPointer: 'p2' },
          ],
        ])
      );
      whiteboard.createQueryBuilder.mockReturnValue(verifyQB([[]]));
      fileService.getContentBatch.mockImplementation(async (ids: string[]) => [
        { id: ids[0], found: true },
      ]);

      const summary = await svc.verifyAll();

      expect(summary.pointersChecked).toBe(2);
      // Two pointers in one DB page -> two separate single-id content requests,
      // never one 2-id (potentially multi-hundred-MiB) request.
      expect(fileService.getContentBatch).toHaveBeenCalledTimes(2);
      expect(fileService.getContentBatch).toHaveBeenNthCalledWith(1, ['p1']);
      expect(fileService.getContentBatch).toHaveBeenNthCalledWith(2, ['p2']);
    });
  });
});
