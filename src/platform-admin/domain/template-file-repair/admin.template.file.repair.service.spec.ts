import { ValidationException } from '@common/exceptions';
import { compressText, decompressText } from '@common/utils/compression.util';
import { ActorContext } from '@core/actor-context/actor.context';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { describe, expect, it, vi } from 'vitest';
import { AdminTemplateFileRepairService } from './admin.template.file.repair.service';

const URL_BASE = 'https://alkem.io/api/private/rest/storage/document';
const FOREIGN = '11111111-1111-1111-1111-111111111111';
const OWN = '22222222-2222-2222-2222-222222222222';

const slot = (overrides: Record<string, unknown>) => ({
  templateID: 'template-1',
  templateName: 'J5',
  kind: 'profileDescription',
  entityID: 'profile-1',
  bucketID: 'own-bucket',
  text: `![a](${URL_BASE}/${FOREIGN}) ![b](${URL_BASE}/${OWN})`,
  ...overrides,
});

const createService = (slots: unknown[]) => {
  const query = vi.fn(async (sql: string, _params?: unknown[]) => {
    if (sql.includes('with recursive')) return slots;
    if (sql.startsWith('select id, "storageBucketId" from file')) {
      return [
        { id: FOREIGN, storageBucketId: 'private-subspace-bucket' },
        { id: OWN, storageBucketId: 'own-bucket' },
      ];
    }
    if (sql.includes('from memo')) return [{ contentPointer: null }];
    return [];
  });
  const entityManager = { query };
  const profileDocuments = {
    reuploadDocumentsInMarkdownToStorageBucket: vi
      .fn()
      .mockResolvedValue('repaired markdown'),
    reuploadFileOnStorageBucket: vi.fn(),
  };
  const storageBuckets = {
    getStorageBucketOrFail: vi
      .fn()
      .mockResolvedValue({ id: 'own-bucket', documents: [] }),
  };
  const whiteboards = {
    getWhiteboardContent: vi.fn().mockResolvedValue('snapshot'),
    listAssetFileIDs: vi.fn().mockResolvedValue([FOREIGN]),
    copyForeignAssetsIntoOwnBucket: vi.fn().mockResolvedValue(1),
    materializeContentIntoBucket: vi.fn().mockResolvedValue({
      content: 'rehomed-snapshot',
      createdDocumentIDs: ['copy-1'],
    }),
    deleteMaterializedContentDocuments: vi.fn(),
  };
  const service = new AdminTemplateFileRepairService(
    entityManager as any,
    profileDocuments as any,
    storageBuckets as any,
    whiteboards as any,
    {} as any,
    MockWinstonProvider.useValue as any
  );
  return { service, query, profileDocuments, whiteboards };
};

const actor = { actorID: 'ops-1' } as ActorContext;

describe('AdminTemplateFileRepairService', () => {
  it('lists only references stored outside their own bucket on a dry run, and copies nothing', async () => {
    const ctx = createService([slot({})]);

    const result = await ctx.service.repair(undefined, true, actor);

    expect(result.references).toEqual([
      expect.objectContaining({
        templateID: 'template-1',
        location: 'profileDescription',
        fileID: FOREIGN,
        storageBucketID: 'private-subspace-bucket',
        copied: false,
      }),
    ]);
    expect(result.templatesWithForeignFiles).toBe(1);
    expect(
      ctx.profileDocuments.reuploadDocumentsInMarkdownToStorageBucket
    ).not.toHaveBeenCalled();
    expect(ctx.query).not.toHaveBeenCalledWith(
      expect.stringContaining('update'),
      expect.anything()
    );
  });

  it('refuses to apply without the reviewed template IDs', async () => {
    const ctx = createService([slot({})]);

    await expect(ctx.service.repair(undefined, false, actor)).rejects.toThrow(
      ValidationException
    );
    expect(ctx.query).not.toHaveBeenCalled();
  });

  it('copies the files of the named templates and stores the rewritten text', async () => {
    const ctx = createService([
      slot({}),
      slot({ kind: 'whiteboard', entityID: 'wb-1', text: null }),
    ]);

    const result = await ctx.service.repair(['template-1'], false, actor);

    expect(
      ctx.profileDocuments.reuploadDocumentsInMarkdownToStorageBucket
    ).toHaveBeenCalledWith(expect.any(String), expect.anything(), {
      copyAnyFile: true,
    });
    expect(ctx.query).toHaveBeenCalledWith(
      'update "profile" set "description" = $1 where id = $2',
      ['repaired markdown', 'profile-1']
    );
    expect(ctx.whiteboards.copyForeignAssetsIntoOwnBucket).toHaveBeenCalledWith(
      'wb-1',
      actor
    );
    expect(result.copiedReferences).toBe(2);
    expect(result.failed).toEqual([]);
  });

  it('reads and writes a default whiteboard in the compressed form its column stores', async () => {
    const ctx = createService([
      slot({
        kind: 'defaultWhiteboardContent',
        entityID: 'defaults-1',
        text: await compressText('stored-snapshot'),
      }),
    ]);

    const result = await ctx.service.repair(['template-1'], false, actor);

    expect(ctx.whiteboards.listAssetFileIDs).toHaveBeenCalledWith(
      'stored-snapshot'
    );
    const update = ctx.query.mock.calls.find(([sql]) =>
      sql.startsWith('update "callout_contribution_defaults"')
    );
    expect(await decompressText(update?.[1]?.[0] as string)).toBe(
      'rehomed-snapshot'
    );
    expect(result.copiedReferences).toBe(1);
  });

  it('does not report a copy when nothing was rewritten', async () => {
    const ctx = createService([slot({})]);
    ctx.profileDocuments.reuploadDocumentsInMarkdownToStorageBucket.mockImplementation(
      async (text: string) => text
    );

    const result = await ctx.service.repair(['template-1'], false, actor);

    expect(result.copiedReferences).toBe(0);
    expect(result.references[0].copied).toBe(false);
    expect(result.failed).toHaveLength(1);
  });

  it('reports memo references instead of rewriting the memo', async () => {
    const ctx = createService([
      slot({ kind: 'memo', entityID: 'memo-1', text: null }),
    ]);
    vi.spyOn(ctx.service as any, 'memoMarkdown').mockResolvedValue(
      `![a](${URL_BASE}/${FOREIGN})`
    );

    const result = await ctx.service.repair(['template-1'], false, actor);

    expect(result.references).toEqual([
      expect.objectContaining({ location: 'memo', copied: false }),
    ]);
    expect(result.failed).toEqual([
      expect.objectContaining({ location: 'memo', entityID: 'memo-1' }),
    ]);
  });
});
