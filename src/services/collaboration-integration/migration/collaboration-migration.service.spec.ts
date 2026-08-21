import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { compressText } from '@common/utils/compression.util';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { CollaborationMigrationService } from './collaboration-migration.service';
import { LegacyContentRecord } from './legacy.content.record';

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
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CollaborationMigrationService,
          MockWinstonProvider,
          { provide: getRepositoryToken(Memo), useValue: memo },
          { provide: getRepositoryToken(Whiteboard), useValue: whiteboard },
          { provide: FileServiceAdapter, useValue: fileService },
        ],
      }).compile();
      svc = module.get(CollaborationMigrationService);
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
