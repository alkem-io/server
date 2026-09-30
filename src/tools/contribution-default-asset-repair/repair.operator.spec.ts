import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { FileServiceAdapterException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import {
  ContributionDefaultRepairCoordinator,
  createManifest,
  createRepairReference,
  type RepairItem,
  type RepairPort,
  readPrivateManifest,
  projectPublicResult,
  sha256,
  writePrivateManifest,
} from './repair.operator';

const item: RepairItem = {
  token: 'opaque-record-token',
  defaultId: 'default-1',
  targetBucketId: 'target-bucket',
  targetAuthorizationId: 'target-auth',
  originalContent: 'original-snapshot',
  originalSnapshotDigest: sha256('original-snapshot'),
  templateId: 'template-1',
  templateAssetRefsDigest: 'template-assets',
  assets: [
    {
      fileId: 'asset-1',
      sourceId: 'source-1',
      expectedExternalID: 'external-1',
      externalReference: 'receipt-1',
    },
  ],
};

const makePort = (): RepairPort => ({
  revalidate: vi.fn().mockResolvedValue({
    content: item.originalContent,
    snapshotDigest: item.originalSnapshotDigest,
    templateId: item.templateId,
    templateAssetRefsDigest: item.templateAssetRefsDigest,
    targetBucketId: item.targetBucketId,
    targetAuthorizationId: item.targetAuthorizationId,
    assets: [{ sourceId: 'source-1', externalID: 'external-1' }],
  }),
  copy: vi.fn().mockResolvedValue({
    id: 'target-document',
    externalID: 'external-1',
    externalReference: 'receipt-1',
    storageBucketId: 'target-bucket',
    createdDirectly: true,
  }),
  findReceipt: vi.fn().mockResolvedValue({
    id: 'target-document',
    externalID: 'external-1',
    externalReference: 'receipt-1',
    storageBucketId: 'target-bucket',
  }),
  buildIntendedContent: vi.fn().mockResolvedValue({
    content: 'intended:target-document',
    snapshotDigest: sha256('canonical:intended:target-document'),
  }),
  replaceContent: vi.fn().mockResolvedValue(true),
  readContent: vi.fn().mockResolvedValue(item.originalContent),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
});

describe('ContributionDefaultRepairCoordinator', () => {
  it('reconciles a lost response and computes the intended digest from the receipt locator', async () => {
    const port = makePort();
    (port.copy as ReturnType<typeof vi.fn>).mockRejectedValue(
      FileServiceAdapterException.fromTransportError(
        'copyDocument',
        new Error('socket closed')
      )
    );

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).resolves.toEqual({
      state: 'applied',
      intendedSnapshotDigest: sha256('canonical:intended:target-document'),
    });
    expect(port.buildIntendedContent).toHaveBeenCalledWith(item, {
      'asset-1': 'target-document',
    });
    expect(port.deleteDocument).not.toHaveBeenCalled();
  });

  it('fails closed on a mismatched receipt without deleting the conflicting row', async () => {
    const port = makePort();
    (port.findReceipt as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'target-document',
      externalID: 'changed-content',
      externalReference: 'receipt-1',
      storageBucketId: 'target-bucket',
    });

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).rejects.toMatchObject({
      code: 'receipt_mismatch',
    });
    expect(port.replaceContent).not.toHaveBeenCalled();
    expect(port.deleteDocument).not.toHaveBeenCalled();
  });

  it.each([
    ['default_drift', { snapshotDigest: 'other' }],
    ['template_drift', { templateAssetRefsDigest: 'other' }],
    ['source_drift', { assets: [{ sourceId: 'source-1', externalID: 'other' }] }],
  ])('stops before copy on %s', async (code, override) => {
    const port = makePort();
    (port.revalidate as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: item.originalContent,
      snapshotDigest: item.originalSnapshotDigest,
      templateId: item.templateId,
      templateAssetRefsDigest: item.templateAssetRefsDigest,
      targetBucketId: item.targetBucketId,
      targetAuthorizationId: item.targetAuthorizationId,
      assets: [{ sourceId: 'source-1', externalID: 'external-1' }],
      ...override,
    });

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).rejects.toMatchObject({
      code,
    });
    expect(port.copy).not.toHaveBeenCalled();
  });

  it('preserves receipts when intended content already won the CAS race', async () => {
    const port = makePort();
    (port.replaceContent as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (port.readContent as ReturnType<typeof vi.fn>).mockResolvedValue(
      'intended:target-document'
    );

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).resolves.toMatchObject({
      state: 'intended',
    });
    expect(port.deleteDocument).not.toHaveBeenCalled();
  });

  it('accepts a rerun whose current default already equals the receipt-derived intended content', async () => {
    const port = makePort();
    (port.revalidate as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: 'intended:target-document',
      snapshotDigest: 'not-the-original-digest',
      templateId: item.templateId,
      templateAssetRefsDigest: item.templateAssetRefsDigest,
      targetBucketId: item.targetBucketId,
      targetAuthorizationId: item.targetAuthorizationId,
      assets: [{ sourceId: 'source-1', externalID: 'external-1' }],
    });

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).resolves.toMatchObject({
      state: 'intended',
    });
    expect(port.replaceContent).not.toHaveBeenCalled();
    expect(port.deleteDocument).not.toHaveBeenCalled();
  });

  it('preserves receipts for divergent post-CAS content', async () => {
    const port = makePort();
    (port.replaceContent as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (port.readContent as ReturnType<typeof vi.fn>).mockResolvedValue('other');

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).rejects.toMatchObject({
      code: 'divergent',
    });
    expect(port.deleteDocument).not.toHaveBeenCalled();
  });

  it('uses stable item facts rather than a manifest digest for the receipt', () => {
    expect(
      createRepairReference('default-1', 'original', 'bucket-1', 'asset-1', 'external-1')
    ).toBe(
      createRepairReference('default-1', 'original', 'bucket-1', 'asset-1', 'external-1')
    );
  });
});

describe('private repair manifest', () => {
  it('writes mode-0600 bytes and does not project private fields into a result', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'repair-manifest-'));
    const path = join(directory, 'manifest.json');
    const manifest = createManifest([item]);
    const digest = await writePrivateManifest(path, manifest);

    expect((await stat(path)).mode & 0o077).toBe(0);
    await expect(readPrivateManifest(path, digest)).resolves.toEqual(manifest);
    await expect(readPrivateManifest(path, sha256('wrong'))).rejects.toThrow(
      'manifest digest mismatch'
    );
  });

  it('rejects an incomplete or extended manifest item', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'repair-manifest-'));
    const path = join(directory, 'manifest.json');
    const manifest = createManifest([item]);
    await writePrivateManifest(path, manifest);
    const altered = JSON.parse(await readFile(path, 'utf8'));
    delete altered.items[0].targetAuthorizationId;
    const bytes = JSON.stringify(altered);
    await writeFile(path, bytes, { mode: 0o600 });

    await expect(readPrivateManifest(path, sha256(bytes))).rejects.toThrow(
      'manifest contains an unknown field'
    );
  });

  it('uses a closed public projection', () => {
    const output = JSON.stringify(
      projectPublicResult('run-token', 'manifest-digest', [
        { token: item.token, stage: 'discover', reason: 'eligible' },
      ])
    );

    expect(output).not.toContain(item.defaultId);
    expect(output).not.toContain(item.targetBucketId);
    expect(output).not.toContain(item.targetAuthorizationId);
    expect(output).not.toContain(item.originalContent);
    expect(output).not.toContain(item.assets[0].sourceId);
  });
});
