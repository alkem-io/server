import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { compressText } from '@common/utils/compression.util';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
    select: vi.fn(() => qb),
    addSelect: vi.fn(() => qb),
    orderBy: vi.fn(() => qb),
    // Keyset pagination uses `limit` + `where`; keep `skip`/`take` chainable too
    // so the mock tolerates either pagination style.
    limit: vi.fn(() => qb),
    where: vi.fn(() => qb),
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
      ],
    }).compile();

    service = module.get(CollaborationMigrationService);
  });

  describe('readMemos', () => {
    it('yields memo records as v2 base64 with the policy id (SC-006)', async () => {
      const content = Buffer.from('yjs-v2-bytes');
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([[{ id: 'm1', content, authorizationPolicyId: 'p1' }]])
      );

      const records = await collect(service.readMemos(50));

      expect(records).toEqual([
        {
          id: 'm1',
          contentType: CollaborationContentType.MEMO,
          content: content.toString('base64'),
          authorizationPolicyId: 'p1',
        },
      ]);
    });

    it('yields undefined content for a never-edited memo (NULL content)', async () => {
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'm2', content: null, authorizationPolicyId: 'p2' }],
        ])
      );

      const records = await collect(service.readMemos(50));

      expect(records[0].content).toBeUndefined();
      expect(records[0].id).toBe('m2');
    });

    it('paginates across full batches without gaps', async () => {
      const page1 = Array.from({ length: 2 }, (_, i) => ({
        id: `m${i}`,
        content: Buffer.from('x'),
        authorizationPolicyId: 'p',
      }));
      const page2 = [
        { id: 'm2', content: Buffer.from('x'), authorizationPolicyId: 'p' },
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
          [{ id: 'm0', content: Buffer.from('x'), authorizationPolicyId: 'p' }],
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

    it('handles a memo with a null authorization policy id', async () => {
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [
            {
              id: 'm9',
              content: Buffer.from('x'),
              authorizationPolicyId: null,
            },
          ],
        ])
      );

      const records = await collect(service.readMemos(50));

      expect(records[0].authorizationPolicyId).toBeUndefined();
    });
  });

  describe('readWhiteboards', () => {
    it('yields decompressed Excalidraw JSON with the policy id', async () => {
      const json = '{"elements":[],"files":{}}';
      const compressed = await compressText(json);
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'w1', content: compressed, authorizationPolicyId: 'pw' }],
        ])
      );

      const records = await collect(service.readWhiteboards(50));

      expect(records[0]).toEqual({
        id: 'w1',
        contentType: CollaborationContentType.WHITEBOARD,
        authorizationPolicyId: 'pw',
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
              authorizationPolicyId: 'pw',
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
        queryBuilderMock([
          [{ id: 'w3', content: '', authorizationPolicyId: 'pw' }],
        ])
      );

      const records = await collect(service.readWhiteboards(50));

      expect(records[0].content).toBe('');
      expect(records[0].flagged).toBeUndefined();
    });

    it('terminates on an empty page after a full batch', async () => {
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'w0', content: '', authorizationPolicyId: 'pw' }],
          [],
        ])
      );

      const records = await collect(service.readWhiteboards(1));

      expect(records.map(r => r.id)).toEqual(['w0']);
    });

    it('handles a null authorization policy id', async () => {
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'w4', content: '', authorizationPolicyId: null }],
        ])
      );

      const records = await collect(service.readWhiteboards(50));

      expect(records[0].authorizationPolicyId).toBeUndefined();
    });
  });

  describe('readAll', () => {
    it('streams every memo then every whiteboard', async () => {
      memoRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'm1', content: Buffer.from('x'), authorizationPolicyId: 'p' }],
        ])
      );
      whiteboardRepo.createQueryBuilder.mockReturnValue(
        queryBuilderMock([
          [{ id: 'w1', content: '', authorizationPolicyId: 'pw' }],
        ])
      );

      const records = await collect(service.readAll(50));

      expect(records.map(r => r.contentType)).toEqual([
        CollaborationContentType.MEMO,
        CollaborationContentType.WHITEBOARD,
      ]);
    });
  });
});
