import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  markdownToYjsV2State,
  yjsStateToMarkdown,
} from '@domain/common/memo/conversion';
import { MemoPdfRenderer } from '@domain/common/memo/memo.pdf.renderer';
import { FileServiceAdapterException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { MemoImageRepairService } from './memo-image-repair.service';

const BASE = 'https://alkem.io/api/private/rest/storage/document';
const MISSING_METADATA = '11111111-1111-4111-8111-111111111111';
const MISSING_CONTENT = '22222222-2222-4222-8222-222222222222';
const VALID = '33333333-3333-4333-8333-333333333333';
const TRANSIENT = '44444444-4444-4444-8444-444444444444';
const MALFORMED = '55555555-5555-4555-8555-555555555555';
const source = (id: string) => `${BASE}/${id}`;
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xkAAAAASUVORK5CYII=',
  'base64'
);

const memoDoc = (markdown: string): Y.Doc => {
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, markdownToYjsV2State(markdown));
  return doc;
};

const queryBuilder = (rows: { id: string; storageBucketId: string }[]) => {
  let returned = false;
  const qb: any = {};
  for (const method of [
    'leftJoin',
    'select',
    'addSelect',
    'where',
    'orderBy',
    'limit',
    'andWhere',
  ]) {
    qb[method] = vi.fn(() => qb);
  }
  qb.getRawMany = vi.fn(async () => {
    if (returned) return [];
    returned = true;
    return rows;
  });
  return qb;
};

describe('MemoImageRepairService', () => {
  let doc: Y.Doc;
  let memoRepository: { createQueryBuilder: ReturnType<typeof vi.fn> };
  let documentService: {
    isAlkemioDocumentURL: ReturnType<typeof vi.fn>;
    getDocumentsBaseUrlPath: ReturnType<typeof vi.fn>;
    getDocumentOrFail: ReturnType<typeof vi.fn>;
    getDocumentFromURL: ReturnType<typeof vi.fn>;
  };
  let fileServiceAdapter: {
    getDocumentContent: ReturnType<typeof vi.fn>;
  };
  let collaborationDocumentService: {
    read: ReturnType<typeof vi.fn>;
    mutate: ReturnType<typeof vi.fn>;
  };
  let service: MemoImageRepairService;

  beforeEach(() => {
    doc = memoDoc('plain text');
    memoRepository = {
      createQueryBuilder: vi.fn(() =>
        queryBuilder([{ id: 'memo-1', storageBucketId: 'bucket-1' }])
      ),
    };
    documentService = {
      isAlkemioDocumentURL: vi.fn((value: string) => value.startsWith(BASE)),
      getDocumentsBaseUrlPath: vi.fn(() => BASE),
      getDocumentOrFail: vi.fn(async (id: string) => {
        if (id === MISSING_METADATA) {
          throw new EntityNotFoundException(
            'Document not found',
            LogContext.STORAGE_BUCKET
          );
        }
        return { id, storageBucket: { id: 'bucket-1' } };
      }),
      getDocumentFromURL: vi.fn(async (value: string) => ({
        id: value.slice(BASE.length + 1),
        storageBucket: { id: 'bucket-1' },
        authorization: { id: 'auth-1' },
      })),
    };
    fileServiceAdapter = {
      getDocumentContent: vi.fn(async (id: string) => {
        if (id === MISSING_CONTENT) {
          throw new FileServiceAdapterException(
            'File service HTTP error',
            'getDocumentContent',
            404
          );
        }
        if (id === TRANSIENT) {
          throw new FileServiceAdapterException(
            'File service HTTP error',
            'getDocumentContent',
            503
          );
        }
        if (id === MALFORMED) {
          return Buffer.alloc(0);
        }
        return PNG;
      }),
    };
    collaborationDocumentService = {
      read: vi.fn(async (_id, _type, _actor, reader) => reader(doc)),
      mutate: vi.fn(async (_id, _type, _actor, mutator) => mutator(doc)),
    };
    service = new MemoImageRepairService(
      { warn: vi.fn(), error: vi.fn() } as any,
      memoRepository as any,
      documentService as any,
      fileServiceAdapter as any,
      collaborationDocumentService as any
    );
  });

  it('dry-run reports missing metadata and missing backing bytes, deduplicates repeated lookups, and writes nothing', async () => {
    doc.destroy();
    doc = memoDoc(
      [
        `before ![missing metadata](${source(MISSING_METADATA)})`,
        '',
        `![missing bytes one](${source(MISSING_CONTENT)}) and ![missing bytes two](${source(MISSING_CONTENT)})`,
        '',
        `![valid](${source(VALID)}) ![external](https://example.com/image.png)`,
      ].join('\n')
    );

    const result = await service.repairMemoImages({ actorId: 'actor-1' });

    expect(result).toMatchObject({
      total: 1,
      affected: 1,
      repaired: 0,
      proposedRemovals: 3,
      removedReferences: 0,
      failed: 0,
      dryRun: true,
    });
    expect(result.affectedDocuments[0].references).toEqual([
      {
        source: source(MISSING_METADATA),
        documentId: MISSING_METADATA,
        occurrences: 1,
        reason: 'metadata-missing',
      },
      {
        source: source(MISSING_CONTENT),
        documentId: MISSING_CONTENT,
        occurrences: 2,
        reason: 'content-missing',
      },
    ]);
    expect(documentService.getDocumentOrFail).toHaveBeenCalledTimes(3);
    expect(fileServiceAdapter.getDocumentContent).toHaveBeenCalledTimes(2);
    expect(collaborationDocumentService.mutate).not.toHaveBeenCalled();
  });

  it('apply removes only confirmed-missing repeated image nodes from the fresh live doc, persists through the room, and is harmless on rerun', async () => {
    doc.destroy();
    doc = memoDoc(
      [
        '# Heading',
        '',
        `before **bold** ![lost](${source(MISSING_CONTENT)}) after`,
        '',
        `- keep list ![lost again](${source(MISSING_CONTENT)})`,
        `- keep valid ![valid](${source(VALID)})`,
      ].join('\n')
    );

    const result = await service.repairMemoImages({
      actorId: 'actor-1',
      apply: true,
    });

    expect(result).toMatchObject({
      affected: 1,
      repaired: 1,
      proposedRemovals: 2,
      removedReferences: 2,
      failed: 0,
      dryRun: false,
    });
    expect(collaborationDocumentService.mutate).toHaveBeenCalledWith(
      'memo-1',
      'memo',
      'actor-1',
      expect.any(Function)
    );
    const repairedMarkdown = yjsStateToMarkdown(
      Buffer.from(Y.encodeStateAsUpdateV2(doc))
    );
    expect(repairedMarkdown).toContain('# Heading');
    expect(repairedMarkdown).toContain('before **bold**  after');
    expect(repairedMarkdown).toContain('- keep list');
    expect(repairedMarkdown).toContain(`![valid](${source(VALID)})`);
    expect(repairedMarkdown).not.toContain(source(MISSING_CONTENT));

    collaborationDocumentService.mutate.mockClear();
    memoRepository.createQueryBuilder.mockImplementation(() =>
      queryBuilder([{ id: 'memo-1', storageBucketId: 'bucket-1' }])
    );
    const rerun = await service.repairMemoImages({
      actorId: 'actor-1',
      apply: true,
    });
    expect(rerun).toMatchObject({ affected: 0, repaired: 0, failed: 0 });
    expect(collaborationDocumentService.mutate).not.toHaveBeenCalled();
  });

  it.each([
    [
      'transient file-service error',
      TRANSIENT,
      'file-service:getDocumentContent:http-503',
    ],
    [
      'malformed empty content response',
      MALFORMED,
      'Memo image lookup returned malformed or empty content',
    ],
  ])('leaves the entire memo unchanged on %s', async (_label, documentId, expectedReason) => {
    doc.destroy();
    doc = memoDoc(
      `![confirmed missing](${source(MISSING_CONTENT)}) ![inconclusive](${source(documentId)})`
    );
    const before = Buffer.from(Y.encodeStateAsUpdateV2(doc));

    const result = await service.repairMemoImages({
      actorId: 'actor-1',
      apply: true,
    });

    expect(result).toMatchObject({ affected: 0, repaired: 0, failed: 1 });
    expect(result.failedDocuments[0].reason).toBe(expectedReason);
    expect(collaborationDocumentService.mutate).not.toHaveBeenCalled();
    expect(Buffer.from(Y.encodeStateAsUpdateV2(doc))).toEqual(before);
  });

  it.each([
    [
      'file-service authorization failure',
      new FileServiceAdapterException(
        'File service HTTP error',
        'getDocumentContent',
        403
      ),
      'file-service:getDocumentContent:http-403',
    ],
    [
      'file-service timeout',
      FileServiceAdapterException.fromTransportError(
        'getDocumentContent',
        new Error('request timed out')
      ),
      'file-service:getDocumentContent:transport-failure',
    ],
    [
      'file-service network error',
      FileServiceAdapterException.fromTransportError(
        'getDocumentContent',
        new Error('connection reset')
      ),
      'file-service:getDocumentContent:transport-failure',
    ],
    [
      'file-service 5xx response',
      new FileServiceAdapterException(
        'File service HTTP error',
        'getDocumentContent',
        500
      ),
      'file-service:getDocumentContent:http-500',
    ],
  ])('does not remove images on %s', async (_label, error, expectedReason) => {
    doc.destroy();
    doc = memoDoc(`![inconclusive](${source(VALID)})`);
    const before = Buffer.from(Y.encodeStateAsUpdateV2(doc));
    fileServiceAdapter.getDocumentContent.mockRejectedValueOnce(error);

    const result = await service.repairMemoImages({
      actorId: 'actor-1',
      apply: true,
    });

    expect(result).toMatchObject({ affected: 0, repaired: 0, failed: 1 });
    expect(result.failedDocuments[0].reason).toBe(expectedReason);
    expect(collaborationDocumentService.mutate).not.toHaveBeenCalled();
    expect(Buffer.from(Y.encodeStateAsUpdateV2(doc))).toEqual(before);
  });

  it('does not classify collaboration authorization failure as missing content', async () => {
    collaborationDocumentService.read.mockRejectedValue(
      new Error('Read-only room')
    );

    const result = await service.repairMemoImages({
      actorId: 'actor-1',
      apply: true,
    });

    expect(result).toMatchObject({ affected: 0, repaired: 0, failed: 1 });
    expect(documentService.getDocumentOrFail).not.toHaveBeenCalled();
    expect(collaborationDocumentService.mutate).not.toHaveBeenCalled();
  });

  it('does not report visual loss when the live-room mutation fails before durability', async () => {
    doc.destroy();
    doc = memoDoc(`![lost](${source(MISSING_CONTENT)})`);
    collaborationDocumentService.mutate.mockImplementation(
      async (_id, _type, _actor, mutator) => {
        mutator(doc);
        throw new Error('persist barrier failed');
      }
    );

    const result = await service.repairMemoImages({
      actorId: 'actor-1',
      apply: true,
    });

    expect(result).toMatchObject({
      affected: 1,
      repaired: 0,
      removedReferences: 0,
      failed: 1,
    });
    expect(result.affectedDocuments[0].removedReferences).toBe(0);
  });

  it('the repaired memo projection prepares a PDF without reading the stale image', async () => {
    doc.destroy();
    doc = memoDoc(
      `preserved text ![lost](${source(MISSING_CONTENT)}) and ![valid](${source(VALID)})`
    );
    await service.repairMemoImages({ actorId: 'actor-1', apply: true });
    const markdown = yjsStateToMarkdown(
      Buffer.from(Y.encodeStateAsUpdateV2(doc))
    );
    fileServiceAdapter.getDocumentContent.mockClear();
    const renderer = new MemoPdfRenderer(
      documentService as any,
      { grantAccessOrFail: vi.fn() } as any,
      fileServiceAdapter as any
    );

    const pdf = await renderer.render(
      markdown,
      'bucket-1',
      Object.assign(new ActorContext(), { actorID: 'actor-1' })
    );

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(fileServiceAdapter.getDocumentContent).toHaveBeenCalledTimes(1);
    expect(fileServiceAdapter.getDocumentContent).toHaveBeenCalledWith(VALID);
  });
});
