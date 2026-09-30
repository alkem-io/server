import { createHash, randomBytes } from 'node:crypto';
import { open, rename, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { FileServiceAdapterException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';

export interface RepairAsset {
  fileId: string;
  sourceId: string;
  expectedExternalID: string;
  externalReference: string;
}

export interface RepairItem {
  token: string;
  defaultId: string;
  targetBucketId: string;
  targetAuthorizationId: string;
  originalContent: string;
  originalSnapshotDigest: string;
  templateId: string;
  templateAssetRefsDigest: string;
  assets: RepairAsset[];
}

export interface RepairManifest {
  version: 1;
  runToken: string;
  items: RepairItem[];
}

export interface Receipt {
  id: string;
  externalID: string;
  externalReference?: string;
  storageBucketId: string;
  reused?: boolean;
  createdDirectly?: boolean;
}

export type RepairFailureCode =
  | 'default_drift'
  | 'template_drift'
  | 'target_drift'
  | 'source_drift'
  | 'receipt_mismatch'
  | 'copy_failed'
  | 'cas_conflict'
  | 'divergent';

export class RepairFailure extends Error {
  constructor(
    readonly code: RepairFailureCode,
    readonly cause?: unknown
  ) {
    super(code);
  }
}

export interface RepairPort {
  revalidate(item: RepairItem): Promise<{
    content: string;
    snapshotDigest: string;
    templateId: string;
    templateAssetRefsDigest: string;
    targetBucketId: string;
    targetAuthorizationId: string;
    assets: Array<{ sourceId: string; externalID: string }>;
  }>;
  copy(item: RepairItem, asset: RepairAsset): Promise<Receipt>;
  findReceipt(reference: string, bucketId: string): Promise<Receipt | null>;
  buildIntendedContent(
    item: RepairItem,
    locators: Record<string, string>
  ): Promise<{ content: string; snapshotDigest: string }>;
  replaceContent(
    defaultId: string,
    originalContent: string,
    intendedContent: string
  ): Promise<boolean>;
  readContent(defaultId: string): Promise<string>;
  deleteDocument(documentId: string): Promise<void>;
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
};

export const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value));

export const sha256 = (value: string | Buffer): string =>
  createHash('sha256').update(value).digest('hex');

export const createRepairReference = (
  defaultId: string,
  originalSnapshotDigest: string,
  targetBucketId: string,
  fileId: string,
  expectedExternalID: string
): string =>
  `contribution-default-asset-repair/v1/${sha256(
    [
      defaultId,
      originalSnapshotDigest,
      targetBucketId,
      fileId,
      expectedExternalID,
    ].join('\u0000')
  )}`;

export const createManifest = (items: RepairItem[]): RepairManifest => ({
  version: 1,
  runToken: randomBytes(16).toString('hex'),
  items,
});

export const projectPublicResult = (
  runToken: string,
  manifestDigest: string,
  records: Array<{ token: string; stage: string; reason: string }>
): Record<string, unknown> => {
  const counts = records.reduce<Record<string, number>>((result, record) => {
    result[record.reason] = (result[record.reason] ?? 0) + 1;
    return result;
  }, {});
  return { runToken, manifestDigest, counts, records };
};

export const writePrivateManifest = async (
  path: string,
  manifest: RepairManifest
): Promise<string> => {
  const bytes = Buffer.from(canonicalJson(manifest));
  const temporary = join(dirname(path), `.${randomBytes(12).toString('hex')}`);
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, path);
  return sha256(bytes);
};

export const readPrivateManifest = async (
  path: string,
  expectedDigest: string
): Promise<RepairManifest> => {
  const file = await stat(path);
  if ((file.mode & 0o077) !== 0) {
    throw new Error('manifest permissions are not private');
  }
  const handle = await open(path, 'r');
  let bytes: Buffer;
  try {
    bytes = await handle.readFile();
  } finally {
    await handle.close();
  }
  if (sha256(bytes) !== expectedDigest) {
    throw new Error('manifest digest mismatch');
  }
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('manifest has an unsupported shape');
  }
  const allowed = new Set(['version', 'runToken', 'items']);
  if (Object.keys(parsed).some(key => !allowed.has(key))) {
    throw new Error('manifest contains an unknown field');
  }
  const manifest = parsed as RepairManifest;
  if (
    manifest.version !== 1 ||
    typeof manifest.runToken !== 'string' ||
    !Array.isArray(manifest.items) ||
    new Set(manifest.items.map(item => item.token)).size !== manifest.items.length
  ) {
    throw new Error('manifest has an unsupported shape');
  }
  const itemKeys = new Set([
    'token',
    'defaultId',
    'targetBucketId',
    'targetAuthorizationId',
    'originalContent',
    'originalSnapshotDigest',
    'templateId',
    'templateAssetRefsDigest',
    'assets',
  ]);
  const assetKeys = new Set([
    'fileId',
    'sourceId',
    'expectedExternalID',
    'externalReference',
  ]);
  if (
    manifest.items.some(
      item =>
        !item ||
        typeof item !== 'object' ||
        Object.keys(item).some(key => !itemKeys.has(key)) ||
        !Array.isArray(item.assets) ||
        item.assets.some(
          asset =>
            !asset ||
            typeof asset !== 'object' ||
            Object.keys(asset).some(key => !assetKeys.has(key))
        )
    )
  ) {
    throw new Error('manifest contains an unknown field');
  }
  return manifest;
};

const exactReceipt = (
  receipt: Receipt,
  asset: RepairAsset,
  bucketId: string
): boolean =>
  receipt.externalReference === asset.externalReference &&
  receipt.storageBucketId === bucketId &&
  receipt.externalID === asset.expectedExternalID;

const isTransportFailure = (error: unknown): boolean =>
  error instanceof FileServiceAdapterException && error.httpStatus === undefined;

export class ContributionDefaultRepairCoordinator {
  constructor(private readonly port: RepairPort) {}

  async apply(item: RepairItem): Promise<{
    state: 'applied' | 'intended';
    intendedSnapshotDigest: string;
  }> {
    const evidence = await this.port.revalidate(item);
    if (
      evidence.content === item.originalContent &&
      evidence.snapshotDigest !== item.originalSnapshotDigest
    ) {
      throw new RepairFailure('default_drift');
    }
    if (
      evidence.templateId !== item.templateId ||
      evidence.templateAssetRefsDigest !== item.templateAssetRefsDigest
    ) {
      throw new RepairFailure('template_drift');
    }
    if (
      evidence.targetBucketId !== item.targetBucketId ||
      evidence.targetAuthorizationId !== item.targetAuthorizationId
    ) {
      throw new RepairFailure('target_drift');
    }
    for (const asset of item.assets) {
      const live = evidence.assets.find(value => value.sourceId === asset.sourceId);
      if (!live || live.externalID !== asset.expectedExternalID) {
        throw new RepairFailure('source_drift');
      }
    }

    const directlyCreated: string[] = [];
    try {
      const locators: Record<string, string> = {};
      for (const asset of item.assets) {
        let directlyCreatedId: string | undefined;
        try {
          const receipt = await this.port.copy(item, asset);
          if (receipt.createdDirectly === true) directlyCreatedId = receipt.id;
        } catch (error) {
          if (!isTransportFailure(error)) {
            throw new RepairFailure('copy_failed', error);
          }
        }
        const receipt = await this.port.findReceipt(
          asset.externalReference,
          item.targetBucketId
        );
        if (!receipt || !exactReceipt(receipt, asset, item.targetBucketId)) {
          throw new RepairFailure('receipt_mismatch');
        }
        if (directlyCreatedId === receipt.id) directlyCreated.push(receipt.id);
        locators[asset.fileId] = receipt.id;
      }

      const intended = await this.port.buildIntendedContent(item, locators);
      if (sha256(evidence.content) === sha256(intended.content)) {
        return { state: 'intended', intendedSnapshotDigest: intended.snapshotDigest };
      }
      if (evidence.content !== item.originalContent) {
        throw new RepairFailure('divergent');
      }
      if (
        await this.port.replaceContent(
          item.defaultId,
          item.originalContent,
          intended.content
        )
      ) {
        return { state: 'applied', intendedSnapshotDigest: intended.snapshotDigest };
      }
      const current = await this.port.readContent(item.defaultId);
      if (sha256(current) === sha256(intended.content)) {
        return { state: 'intended', intendedSnapshotDigest: intended.snapshotDigest };
      }
      if (current === item.originalContent) {
        throw new RepairFailure('cas_conflict');
      }
      throw new RepairFailure('divergent');
    } catch (error) {
      const current = await this.port.readContent(item.defaultId).catch(() => undefined);
      if (current === item.originalContent) {
        await Promise.all(
          directlyCreated.map(documentId =>
            this.port.deleteDocument(documentId).catch(() => undefined)
          )
        );
      }
      throw error;
    }
  }
}
