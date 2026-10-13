import { AuthorizationCredential } from '@common/enums';
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

// Read rules keyed by credential type; the owner below is a space's admins.
const readableBy = (...types: string[]) => ({
  id: 'auth',
  type: 'file',
  credentialRules: types,
  privilegeRules: [],
});

// The conditional write: matches the rows it would update and returns how many.
const UPDATE_SQL = (table: string, field: string) =>
  expect.stringContaining(`update "${table}" set "${field}" = $1`);

const updateCall = (
  query: { mock: { calls: [string, unknown[]?][] } },
  table: string
) => query.mock.calls.find(([sql]) => sql.includes(`update "${table}"`));

// Answers shared by every query mock: the scanned count and the conditional write.
const commonAnswer = (sql: string) => {
  if (sql.includes('"templatesScanned"')) return [{ templatesScanned: 1 }];
  if (sql.includes('with u as (update')) return [{ updated: 1 }];
  return undefined;
};

const createService = (
  slots: unknown[],
  foreignReadableBy: string[] = [AuthorizationCredential.SPACE_ADMIN],
  owner: Record<string, unknown> = { spaceID: 'space-1', accountID: null }
) => {
  const query = vi.fn(async (sql: string, _params?: unknown[]) => {
    const common = commonAnswer(sql);
    if (common) return common;
    if (sql.includes('with recursive')) return slots;
    if (sql.includes('from template t')) {
      return [{ templateID: 'template-1', ...owner }];
    }
    if (sql.includes('from file f')) {
      return [
        {
          id: FOREIGN,
          storageBucketId: 'private-subspace-bucket',
          authorization: readableBy(...foreignReadableBy),
        },
        { id: OWN, storageBucketId: 'own-bucket', authorization: null },
      ];
    }
    if (sql.includes('from memo')) return [{ contentPointer: null }];
    if (sql.includes('from whiteboard w')) {
      return [
        {
          authorization: readableBy(
            AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
          ),
        },
      ];
    }
    if (sql.startsWith('select id from file')) return [{ id: FOREIGN }];
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
    copyForeignAssetsIntoOwnBucket: vi.fn().mockResolvedValue(true),
    assetFilesChanged: vi.fn().mockResolvedValue(true),
    materializeContentIntoBucket: vi.fn().mockResolvedValue({
      content: 'rehomed-snapshot',
      createdDocumentIDs: ['copy-1'],
    }),
    deleteMaterializedContentDocuments: vi.fn(),
  };
  const authorization = {
    isAccessGranted: vi.fn(
      (actor: ActorContext, policy: { credentialRules: string[] }) =>
        actor.credentials.some(c => policy.credentialRules.includes(c.type))
    ),
  };
  const service = new AdminTemplateFileRepairService(
    entityManager as any,
    profileDocuments as any,
    storageBuckets as any,
    whiteboards as any,
    {} as any,
    authorization as any,
    { getDocumentsBaseUrlPath: () => URL_BASE } as any,
    MockWinstonProvider.useValue as any
  );
  return { service, query, profileDocuments, whiteboards };
};

const actor = {
  actorID: 'ops-1',
  credentials: [
    { type: AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN, resourceID: '' },
    {
      type: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
      resourceID: '',
    },
  ],
} as ActorContext;

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
        ownerCanRead: true,
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

  it('leaves a file the owner cannot read referenced as written', async () => {
    const ctx = createService(
      [slot({})],
      [AuthorizationCredential.SPACE_MEMBER]
    );

    const result = await ctx.service.repair(undefined, false, actor);

    expect(result.references).toEqual([
      expect.objectContaining({
        fileID: FOREIGN,
        ownerCanRead: false,
        copied: false,
      }),
    ]);
    expect(
      ctx.profileDocuments.reuploadDocumentsInMarkdownToStorageBucket
    ).not.toHaveBeenCalled();
    expect(result.copiedReferences).toBe(0);
    expect(result.failed).toEqual([]);
  });

  it("checks a pack template against its account's admins", async () => {
    const ctx = createService(
      [slot({})],
      [AuthorizationCredential.ACCOUNT_ADMIN],
      { spaceID: null, accountID: 'account-1' }
    );

    const result = await ctx.service.repair(undefined, true, actor);

    expect(result.references[0].ownerCanRead).toBe(true);
  });

  it('gives a platform template only the credentials of a registered user', async () => {
    const ctx = createService(
      [slot({})],
      [AuthorizationCredential.SPACE_ADMIN],
      {
        spaceID: null,
        accountID: null,
      }
    );

    const result = await ctx.service.repair(undefined, true, actor);

    expect(result.references[0].ownerCanRead).toBe(false);
  });

  it('copies the files the owner can read, with the owner as the copy authority', async () => {
    const ctx = createService([
      slot({}),
      slot({ kind: 'whiteboard', entityID: 'wb-1', text: null }),
    ]);

    const result = await ctx.service.repair(undefined, false, actor);

    const owner = expect.objectContaining({
      actorID: '',
      credentials: [
        { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
        { type: AuthorizationCredential.SPACE_ADMIN, resourceID: 'space-1' },
      ],
    });
    expect(
      ctx.profileDocuments.reuploadDocumentsInMarkdownToStorageBucket
    ).toHaveBeenCalledWith(expect.any(String), expect.anything(), {
      actorContext: owner,
    });
    expect(ctx.query).toHaveBeenCalledWith(
      UPDATE_SQL('profile', 'description'),
      ['repaired markdown', 'profile-1', slot({}).text]
    );
    expect(ctx.whiteboards.copyForeignAssetsIntoOwnBucket).toHaveBeenCalledWith(
      'wb-1',
      owner,
      'ops-1'
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
    const update = updateCall(ctx.query, 'callout_contribution_defaults');
    expect(await decompressText(update?.[1]?.[0] as string)).toBe(
      'rehomed-snapshot'
    );
    // Compared against the stored, still compressed value.
    expect(await decompressText(update?.[1]?.[2] as string)).toBe(
      'stored-snapshot'
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

  it("repairs a space template's who and why into the about profile's bucket", async () => {
    const ctx = createService([
      slot({ kind: 'spaceAboutWho', entityID: 'about-1' }),
      slot({ kind: 'flowStateDescription', entityID: 'state-1' }),
    ]);

    const result = await ctx.service.repair(undefined, false, actor);

    expect(ctx.query).toHaveBeenCalledWith(UPDATE_SQL('space_about', 'who'), [
      'repaired markdown',
      'about-1',
      slot({}).text,
    ]);
    expect(ctx.query).toHaveBeenCalledWith(
      UPDATE_SQL('innovation_flow_state', 'description'),
      ['repaired markdown', 'state-1', slot({}).text]
    );
    expect(result.copiedReferences).toBe(2);
  });

  it('points a link written with a retired host at this server before copying', async () => {
    const ctx = createService([
      slot({
        text: `![a](https://acc.alkem.io/api/private/rest/storage/document/${FOREIGN})`,
      }),
    ]);

    await ctx.service.repair(undefined, false, actor);

    expect(
      ctx.profileDocuments.reuploadDocumentsInMarkdownToStorageBucket
    ).toHaveBeenCalledWith(
      `![a](${URL_BASE}/${FOREIGN})`,
      expect.anything(),
      expect.anything()
    );
  });

  it('refuses to rewrite a whiteboard the operator cannot edit, copying nothing', async () => {
    const ctx = createService([
      slot({ kind: 'whiteboard', entityID: 'wb-1', text: null }),
    ]);
    const opsOnly = {
      actorID: 'ops-1',
      credentials: [
        {
          type: AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN,
          resourceID: '',
        },
      ],
    } as ActorContext;

    const result = await ctx.service.repair(undefined, false, opsOnly);

    expect(
      ctx.whiteboards.copyForeignAssetsIntoOwnBucket
    ).not.toHaveBeenCalled();
    expect(result.failed).toEqual([
      expect.objectContaining({
        location: 'whiteboard',
        reason: expect.stringContaining('Platform Content Full Access'),
      }),
    ]);
  });

  it('reports references to files that no longer exist', async () => {
    const GONE = '33333333-3333-3333-3333-333333333333';
    const ctx = createService([slot({ text: `![x](${URL_BASE}/${GONE})` })]);

    const result = await ctx.service.repair(undefined, true, actor);

    expect(result.missingFiles).toEqual([
      expect.objectContaining({ fileID: GONE, location: 'profileDescription' }),
    ]);
  });

  it('reports an office document stored outside the template instead of moving it', async () => {
    const ctx = createService([
      slot({ kind: 'collaboraDocument', entityID: 'doc-1', text: null }),
    ]);
    ctx.query.mockImplementation(async (sql: string) => {
      const common = commonAnswer(sql);
      if (common) return common;
      if (sql.includes('with recursive')) {
        return [
          slot({ kind: 'collaboraDocument', entityID: 'doc-1', text: null }),
        ];
      }
      if (sql.includes('from template t')) {
        return [
          { templateID: 'template-1', spaceID: 'space-1', accountID: null },
        ];
      }
      if (sql.includes('from collabora_document'))
        return [{ documentId: FOREIGN }];
      if (sql.includes('from file f')) {
        return [
          {
            id: FOREIGN,
            storageBucketId: 'private-subspace-bucket',
            authorization: readableBy(AuthorizationCredential.SPACE_ADMIN),
          },
        ];
      }
      return [];
    });

    const result = await ctx.service.repair(undefined, false, actor);

    expect(result.references).toEqual([
      expect.objectContaining({ location: 'collaboraDocument', copied: false }),
    ]);
    expect(result.failed).toEqual([
      expect.objectContaining({ location: 'collaboraDocument' }),
    ]);
  });

  it('does not overwrite a reference edited while the run was in progress', async () => {
    const ctx = createService([slot({})]);
    const answer = ctx.query.getMockImplementation()!;
    ctx.query.mockImplementation(async (sql: string, params?: unknown[]) =>
      sql.includes('with u as (update') ? [{ updated: 0 }] : answer(sql, params)
    );

    const result = await ctx.service.repair(undefined, false, actor);

    expect(result.copiedReferences).toBe(0);
    expect(result.references[0].copied).toBe(false);
    expect(result.failed).toEqual([
      expect.objectContaining({
        location: 'profileDescription',
        reason: expect.stringContaining('changed while the repair ran'),
      }),
    ]);
  });

  it('processes no template for an empty list, and every template when the list is omitted', async () => {
    const ctx = createService([]);

    await ctx.service.repair([], true, actor);
    await ctx.service.repair(undefined, true, actor);

    const filters = ctx.query.mock.calls
      .filter(([sql]) => sql.includes('with recursive'))
      .map(([, params]) => params?.[0]);
    expect(filters).toEqual([[], null]);
  });

  it('counts the templates scanned, including those with nothing to report', async () => {
    const ctx = createService([]);

    const result = await ctx.service.repair(['template-1'], true, actor);

    expect(result.templatesScanned).toBe(1);
    expect(result.references).toEqual([]);
  });

  it('reports a memo whose content cannot be read as a failure', async () => {
    const ctx = createService([
      slot({ kind: 'memo', entityID: 'memo-1', text: null }),
    ]);
    const answer = ctx.query.getMockImplementation()!;
    ctx.query.mockImplementation(async (sql: string, params?: unknown[]) =>
      sql.includes('from memo')
        ? [{ contentPointer: 'pointer-1' }]
        : answer(sql, params)
    );
    (ctx.service as any).fileServiceAdapter = {
      getContentBatch: vi.fn().mockResolvedValue([{ found: false }]),
    };

    const result = await ctx.service.repair(undefined, true, actor);

    expect(result.failed).toEqual([
      expect.objectContaining({
        location: 'memo',
        reason: expect.stringContaining('could not be read'),
      }),
    ]);
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
