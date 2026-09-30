import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compressText, decompressText } from '@common/utils/compression.util';
import { loadWhiteboardFork } from '@domain/common/whiteboard/whiteboard.fork';
import { describe, expect, it, vi } from 'vitest';
import {
  createRepairReference,
  sha256,
  type RepairItem,
} from './repair.operator';
import { ContributionDefaultAssetRepairService } from './contribution.default.asset.repair.service';

const nodeRequire = createRequire(__filename);
const Y = nodeRequire('yjs') as typeof import('yjs');

const makeService = (
  query = vi.fn().mockResolvedValue([]),
  storageBucket = { copyDocumentToBucket: vi.fn() },
  document = { getDocumentOrFail: vi.fn() }
) =>
  new ContributionDefaultAssetRepairService(
    { query } as any,
    {
      getDocumentContent: vi.fn(),
      getDocumentByReference: vi.fn(),
    } as any,
    storageBucket as any,
    document as any
  );

const makeItem = async (): Promise<RepairItem> => {
  const fork = await loadWhiteboardFork();
  const document = new Y.Doc();
  try {
    fork.writeAssetLocators(
      document.getMap(fork.FILES),
      { 'asset-a': 'source-a', 'asset-b': 'source-b' },
      { prune: true }
    );
    const bytes = Buffer.from(Y.encodeStateAsUpdateV2(document));
    const originalSnapshotDigest = sha256(bytes);
    return {
      token: 'opaque-token',
      defaultId: 'default-1',
      targetBucketId: 'bucket-1',
      originalContent: await compressText(bytes.toString('base64')),
      originalSnapshotDigest,
      templateId: 'template-1',
      templateSnapshotDigest: 'template-snapshot',
      templateAssetRefsDigest: 'template-assets',
      assets: [
        {
          fileId: 'asset-a',
          sourceId: 'source-a',
          expectedExternalID: 'external-a',
          externalReference: createRepairReference(
            'default-1',
            originalSnapshotDigest,
            'bucket-1',
            'asset-a',
            'external-a'
          ),
        },
        {
          fileId: 'asset-b',
          sourceId: 'source-b',
          expectedExternalID: 'external-b',
          externalReference: createRepairReference(
            'default-1',
            originalSnapshotDigest,
            'bucket-1',
            'asset-b',
            'external-b'
          ),
        },
      ],
    };
  } finally {
    document.destroy();
  }
};

describe('ContributionDefaultAssetRepairService', () => {
  it('keeps apply behind the explicit runtime guard', async () => {
    const service = makeService();
    vi.stubEnv('CONTRIBUTION_DEFAULT_ASSET_REPAIR_APPLY', 'false');

    await expect(
      service.execute({
        mode: 'apply',
        manifestPath: '/unreadable/manifest.json',
        sha256: 'ignored',
      })
    ).rejects.toThrow('apply mode is not authorized');

    vi.unstubAllEnvs();
  });

  it('discovers every non-null default with LEFT joins and reports a missing target bucket only', async () => {
    const query = vi.fn().mockResolvedValue([
      { defaultId: 'default-orphan', content: 'opaque', targetBucketId: null },
    ]);
    const service = makeService(query);
    const manifestPath = join(
      await mkdtemp(join(tmpdir(), 'repair-discover-')),
      'manifest.json'
    );

    const execution = await service.execute({ mode: 'discover', manifestPath });

    expect(execution).toMatchObject({
      ok: true,
      result: { counts: { report_only: 1 } },
    });
    expect(query.mock.calls[0][0]).toContain('LEFT JOIN "callout"');
    expect(query.mock.calls[0][0]).toContain('WHERE defaults."whiteboardContent" IS NOT NULL');
  });

  it('uses normal per-document destination ownership for each copied asset', async () => {
    const storageBucket = {
      copyDocumentToBucket: vi
        .fn()
        .mockResolvedValueOnce({ id: 'target-a', externalID: 'external-a' })
        .mockResolvedValueOnce({ id: 'target-b', externalID: 'external-b' }),
    };
    const sourceA = { id: 'source-a', createdBy: 'foreign-user' };
    const sourceB = { id: 'source-b', createdBy: 'foreign-user' };
    const document = {
      getDocumentOrFail: vi
        .fn()
        .mockResolvedValueOnce(sourceA)
        .mockResolvedValueOnce(sourceB),
    };
    const service = makeService(undefined, storageBucket, document);
    const item = await makeItem();

    await service.copy(item, item.assets[0]);
    await service.copy(item, item.assets[1]);

    expect(storageBucket.copyDocumentToBucket).toHaveBeenNthCalledWith(
      1,
      'bucket-1',
      { id: 'source-a', createdBy: undefined },
      undefined,
      false,
      { externalReference: item.assets[0].externalReference }
    );
    expect(storageBucket.copyDocumentToBucket).toHaveBeenNthCalledWith(
      2,
      'bucket-1',
      { id: 'source-b', createdBy: undefined },
      undefined,
      false,
      { externalReference: item.assets[1].externalReference }
    );
    expect(sourceA.createdBy).toBe('foreign-user');
    expect(sourceB.createdBy).toBe('foreign-user');
  });

  it('builds byte-identical intended Yjs snapshots and rewrites every locator', async () => {
    const service = makeService();
    const item = await makeItem();
    const locators = { 'asset-a': 'target-a', 'asset-b': 'target-b' };

    const first = await service.buildIntendedContent(item, locators);
    const second = await service.buildIntendedContent(item, locators);
    const firstBytes = Buffer.from(await decompressText(first.content), 'base64');
    const fork = await loadWhiteboardFork();
    const document = new Y.Doc();
    try {
      Y.applyUpdateV2(document, firstBytes);
      expect(first).toEqual(second);
      expect(first.snapshotDigest).toBe(sha256(firstBytes));
      expect(fork.readAssetLocators(document.getMap(fork.FILES))).toEqual(locators);
    } finally {
      document.destroy();
    }
  });

  it('uses default ID and exact original content as the CAS operands', async () => {
    const query = vi.fn().mockResolvedValue([[{ id: 'default-1' }], 1]);
    const service = makeService(query);

    await expect(
      service.replaceContent('default-1', 'original-content', 'intended-content')
    ).resolves.toBe(true);
    expect(query.mock.calls[0]).toEqual([
      expect.stringContaining(
        'WHERE "id" = $2 AND "whiteboardContent" = $3'
      ),
      ['intended-content', 'default-1', 'original-content'],
    ]);
    query.mockResolvedValueOnce([[], 0]);
    await expect(
      service.replaceContent('default-1', 'original-content', 'intended-content')
    ).resolves.toBe(false);
  });

  it('requires the manifest to exactly represent the original asset map before apply', async () => {
    const service = makeService();
    const item = await makeItem();

    await expect((service as any).validateManifestItem(item)).resolves.toBeUndefined();
    await expect(
      (service as any).validateManifestItem({
        ...item,
        assets: item.assets.slice(0, 1),
      })
    ).rejects.toThrow('manifest asset map mismatch');
    await expect(
      (service as any).validateManifestItem({
        ...item,
        originalSnapshotDigest: 'tampered',
      })
    ).rejects.toThrow('manifest original snapshot digest mismatch');
  });

  it('fails discovery evidence collection when a live template cannot be read', async () => {
    const query = vi.fn().mockResolvedValue([
      { id: 'template-1', contentPointer: 'template-document-1' },
    ]);
    const failure = new Error('template read unavailable');
    const service = new ContributionDefaultAssetRepairService(
      { query } as any,
      {
        getDocumentContent: vi.fn().mockRejectedValue(failure),
        getDocumentByReference: vi.fn(),
      } as any,
      { copyDocumentToBucket: vi.fn() } as any,
      { getDocumentOrFail: vi.fn() } as any
    );

    await expect(
      (service as any).matchingTemplates({ 'asset-a': 'source-a' })
    ).rejects.toBe(failure);
  });
});
