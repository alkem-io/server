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
  projectPublicResult,
  readPrivateManifest,
  sha256,
  writePrivateManifest,
} from './repair.operator';

const originalSnapshotDigest = sha256('original-snapshot');
const externalReference = createRepairReference(
  'default-1',
  originalSnapshotDigest,
  'target-bucket',
  'asset-1',
  'external-1'
);
const intendedSnapshotDigest = sha256('canonical:intended:target-document');
const item: RepairItem = {
  token: 'opaque-record-token',
  defaultId: 'default-1',
  targetBucketId: 'target-bucket',
  originalContent: 'original-snapshot',
  originalSnapshotDigest,
  templateId: 'template-1',
  templateSnapshotDigest: 'template-snapshot',
  templateAssetRefsDigest: 'template-assets',
  assets: [
    {
      fileId: 'asset-1',
      sourceId: 'source-1',
      expectedExternalID: 'external-1',
      externalReference,
    },
  ],
};
const receipt = {
  id: 'target-document',
  externalID: 'external-1',
  externalReference,
  storageBucketId: 'target-bucket',
};

const makePort = (): RepairPort => ({
  revalidate: vi.fn().mockResolvedValue({
    content: item.originalContent,
    snapshotDigest: item.originalSnapshotDigest,
    templateId: item.templateId,
    templateSnapshotDigest: item.templateSnapshotDigest,
    templateAssetRefsDigest: item.templateAssetRefsDigest,
    targetBucketId: item.targetBucketId,
    assets: [{ sourceId: 'source-1', externalID: 'external-1' }],
  }),
  copy: vi.fn().mockResolvedValue(receipt),
  findReceipt: vi.fn().mockResolvedValue(receipt),
  buildIntendedContent: vi.fn().mockResolvedValue({
    content: 'intended:target-document',
    snapshotDigest: intendedSnapshotDigest,
  }),
  replaceContent: vi.fn().mockResolvedValue(true),
  readCurrent: vi.fn().mockResolvedValue({
    content: item.originalContent,
    snapshotDigest: item.originalSnapshotDigest,
  }),
});

describe('ContributionDefaultRepairCoordinator', () => {
  it('reconciles a lost response and computes intended content from the receipt locator', async () => {
    const port = makePort();
    (port.findReceipt as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(receipt);
    (port.copy as ReturnType<typeof vi.fn>).mockRejectedValue(
      FileServiceAdapterException.fromTransportError(
        'copyDocument',
        new Error('socket closed')
      )
    );

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).resolves.toEqual({
      state: 'applied',
      intendedSnapshotDigest,
    });
    expect(port.buildIntendedContent).toHaveBeenCalledWith(item, {
      'asset-1': 'target-document',
    });
  });

  it('fails closed on a mismatched receipt without deleting the conflicting row', async () => {
    const port = makePort();
    (port.findReceipt as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...receipt,
      externalID: 'changed-content',
    });

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).rejects.toMatchObject({
      code: 'receipt_mismatch',
    });
    expect(port.replaceContent).not.toHaveBeenCalled();
  });

  it.each([
    ['default_drift', { snapshotDigest: 'other' }],
    ['template_drift', { templateSnapshotDigest: 'other' }],
    ['source_drift', { assets: [{ sourceId: 'source-1', externalID: 'other' }] }],
  ])('stops before copy on %s', async (code, override) => {
    const port = makePort();
    (port.revalidate as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: item.originalContent,
      snapshotDigest: item.originalSnapshotDigest,
      templateId: item.templateId,
      templateSnapshotDigest: item.templateSnapshotDigest,
      templateAssetRefsDigest: item.templateAssetRefsDigest,
      targetBucketId: item.targetBucketId,
      assets: [{ sourceId: 'source-1', externalID: 'external-1' }],
      ...override,
    });

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).rejects.toMatchObject({
      code,
    });
    expect(port.copy).not.toHaveBeenCalled();
  });

  it('does not copy a missing receipt when current content is divergent', async () => {
    const port = makePort();
    (port.revalidate as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: 'other-content',
      snapshotDigest: 'other-snapshot',
      templateId: item.templateId,
      templateSnapshotDigest: item.templateSnapshotDigest,
      templateAssetRefsDigest: item.templateAssetRefsDigest,
      targetBucketId: item.targetBucketId,
      assets: [{ sourceId: 'source-1', externalID: 'external-1' }],
    });
    (port.findReceipt as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).rejects.toMatchObject({
      code: 'divergent',
    });
    expect(port.copy).not.toHaveBeenCalled();
  });

  it('preserves a direct receipt after a CAS conflict', async () => {
    const port = makePort();
    (port.findReceipt as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(receipt);
    (port.replaceContent as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).rejects.toMatchObject({
      code: 'cas_conflict',
    });
    expect(port.copy).toHaveBeenCalledTimes(1);
  });

  it('accepts a rerun whose current default already equals receipt-derived intended content', async () => {
    const port = makePort();
    (port.revalidate as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: 'intended:target-document',
      snapshotDigest: intendedSnapshotDigest,
      templateId: item.templateId,
      templateSnapshotDigest: item.templateSnapshotDigest,
      templateAssetRefsDigest: item.templateAssetRefsDigest,
      targetBucketId: item.targetBucketId,
      assets: [{ sourceId: 'source-1', externalID: 'external-1' }],
    });

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).resolves.toMatchObject({
      state: 'intended',
    });
    expect(port.copy).not.toHaveBeenCalled();
    expect(port.replaceContent).not.toHaveBeenCalled();
  });

  it('accepts a receipt-derived intended snapshot after a CAS race', async () => {
    const port = makePort();
    (port.replaceContent as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (port.readCurrent as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: 'intended:target-document',
      snapshotDigest: intendedSnapshotDigest,
    });

    await expect(new ContributionDefaultRepairCoordinator(port).apply(item)).resolves.toMatchObject({
      state: 'intended',
    });
  });
});

describe('private repair manifest', () => {
  it('writes mode-0600 bytes and has a closed public projection', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'repair-manifest-'));
    const path = join(directory, 'manifest.json');
    const manifest = createManifest([item]);
    const digest = await writePrivateManifest(path, manifest);

    expect((await stat(path)).mode & 0o077).toBe(0);
    await expect(readPrivateManifest(path, digest)).resolves.toEqual(manifest);
    const output = JSON.stringify(
      projectPublicResult('run-token', 'manifest-digest', [
        { token: item.token, stage: 'discover', reason: 'eligible' },
      ])
    );
    expect(output).not.toContain(item.defaultId);
    expect(output).not.toContain(item.originalContent);
  });

  it('recomputes references and rejects duplicate file IDs or receipt references', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'repair-manifest-'));
    const path = join(directory, 'manifest.json');
    const manifest = createManifest([item]);
    await writePrivateManifest(path, manifest);
    const altered = JSON.parse(await readFile(path, 'utf8'));
    altered.items[0].assets.push({
      ...altered.items[0].assets[0],
      fileId: 'asset-2',
    });
    const duplicateReference = JSON.stringify(altered);
    await writeFile(path, duplicateReference, { mode: 0o600 });
    await expect(readPrivateManifest(path, sha256(duplicateReference))).rejects.toThrow(
      'manifest contains inconsistent receipts'
    );

    altered.items[0].assets[1] = {
      ...altered.items[0].assets[0],
      expectedExternalID: 'external-2',
      externalReference: createRepairReference(
        item.defaultId,
        item.originalSnapshotDigest,
        item.targetBucketId,
        'asset-1',
        'external-2'
      ),
    };
    const duplicateFile = JSON.stringify(altered);
    await writeFile(path, duplicateFile, { mode: 0o600 });
    await expect(readPrivateManifest(path, sha256(duplicateFile))).rejects.toThrow(
      'manifest contains inconsistent receipts'
    );
  });
});
