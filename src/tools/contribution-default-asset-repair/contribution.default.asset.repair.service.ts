import { createRequire } from 'node:module';
import { compressText, decompressText } from '@common/utils/compression.util';
import { loadWhiteboardFork } from '@domain/common/whiteboard/whiteboard.fork';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { DataSource } from 'typeorm';
import type { Doc } from 'yjs';
import type { RepairCommand } from './repair.command';
import {
  canonicalJson,
  ContributionDefaultRepairCoordinator,
  createManifest,
  createRepairReference,
  projectPublicResult,
  RepairFailure,
  type RepairAsset,
  type RepairItem,
  type RepairPort,
  readPrivateManifest,
  sha256,
  writePrivateManifest,
} from './repair.operator';

const nodeRequire = createRequire(__filename);
const Y = nodeRequire('yjs') as typeof import('yjs');

type CandidateRow = {
  defaultId: string;
  content: string;
  targetBucketId: string | null;
};

const deterministicYjsClientID = (item: RepairItem, document: Doc): number => {
  const candidate = Number.parseInt(
    sha256(
      [item.defaultId, item.originalSnapshotDigest, item.targetBucketId].join(
        '\u0000'
      )
    ).slice(0, 8),
    16
  );
  let clientID = candidate === 0 ? 1 : candidate;
  while (document.store.clients.has(clientID)) {
    clientID = clientID === 0xffffffff ? 1 : clientID + 1;
  }
  return clientID;
};

@Injectable()
export class ContributionDefaultAssetRepairService implements RepairPort {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fileServiceAdapter: FileServiceAdapter,
    private readonly storageBucketService: StorageBucketService,
    private readonly documentService: DocumentService
  ) {}

  async execute(
    command: RepairCommand
  ): Promise<{ ok: boolean; result: Record<string, unknown> }> {
    if (command.mode === 'discover') {
      return { ok: true, result: await this.discover(command.manifestPath) };
    }
    if (process.env.CONTRIBUTION_DEFAULT_ASSET_REPAIR_APPLY !== 'true') {
      throw new Error('apply mode is not authorized');
    }
    const manifest = await readPrivateManifest(command.manifestPath, command.sha256);
    const coordinator = new ContributionDefaultRepairCoordinator(this);
    const records: Array<{ token: string; stage: string; reason: string }> = [];
    for (const item of manifest.items) {
      try {
        await this.validateManifestItem(item);
        const result = await coordinator.apply(item);
        records.push({ token: item.token, stage: 'apply', reason: result });
      } catch (error) {
        records.push({
          token: item.token,
          stage: 'apply',
          reason: error instanceof RepairFailure ? error.code : 'failed',
        });
        return {
          ok: false,
          result: projectPublicResult(manifest.runToken, command.sha256, records),
        };
      }
    }
    return {
      ok: true,
      result: projectPublicResult(manifest.runToken, command.sha256, records),
    };
  }

  async revalidate(item: RepairItem): ReturnType<RepairPort['revalidate']> {
    const current = await this.readCandidate(item.defaultId);
    if (!current) {
      return {
        snapshotDigest: '',
        templateId: '',
        templateSnapshotDigest: '',
        templateAssetRefsDigest: '',
        targetBucketId: '',
        assets: [],
      };
    }
    const templates = await this.matchingTemplates(
      Object.fromEntries(item.assets.map(asset => [asset.fileId, asset.sourceId]))
    );
    const sources = await this.readSources(item.assets.map(asset => asset.sourceId));
    const snapshotDigest = sha256(await this.snapshotBytes(current.content));
    return {
      snapshotDigest,
      templateId: templates.length === 1 ? templates[0].id : '',
      templateSnapshotDigest:
        templates.length === 1 ? templates[0].snapshotDigest : '',
      templateAssetRefsDigest:
        templates.length === 1 ? templates[0].assetRefsDigest : '',
      targetBucketId: current.targetBucketId ?? '',
      assets: item.assets.flatMap(asset => {
        const source = sources.get(asset.sourceId);
        return source
          ? [{ sourceId: asset.sourceId, externalID: source.externalID }]
          : [];
      }),
    };
  }

  async copy(item: RepairItem, asset: RepairAsset) {
    const source = await this.documentService.getDocumentOrFail(asset.sourceId);
    const result = await this.storageBucketService.copyDocumentToBucket(
      item.targetBucketId,
      { ...source, createdBy: undefined },
      undefined,
      false,
      { externalReference: asset.externalReference }
    );
    return {
      ...result,
      externalReference: asset.externalReference,
      storageBucketId: item.targetBucketId,
    };
  }

  async findReceipt(reference: string, bucketId: string) {
    return this.fileServiceAdapter.getDocumentByReference(reference, bucketId);
  }

  async buildIntendedContent(item: RepairItem, locators: Record<string, string>) {
    const bytes = await this.snapshotBytes(item.originalContent);
    const fork = await loadWhiteboardFork();
    const document = new Y.Doc();
    try {
      Y.applyUpdateV2(document, bytes);
      document.clientID = deterministicYjsClientID(item, document);
      fork.writeAssetLocators(document.getMap(fork.FILES), locators, { prune: true });
      const intendedBytes = Buffer.from(Y.encodeStateAsUpdateV2(document));
      const intended = intendedBytes.toString('base64');
      return {
        content: await compressText(intended),
        snapshotDigest: sha256(intendedBytes),
      };
    } finally {
      document.destroy();
    }
  }

  async replaceContent(
    defaultId: string,
    originalContent: string,
    intendedContent: string
  ): Promise<boolean> {
    const [returnedRows, affected] = (await this.dataSource.query(
      `UPDATE "callout_contribution_defaults"
          SET "whiteboardContent" = $1
        WHERE "id" = $2 AND "whiteboardContent" = $3
        RETURNING "id"`,
      [intendedContent, defaultId, originalContent]
    )) as [Array<{ id: string }>, number];
    return affected === 1 && returnedRows.length === 1;
  }

  async readCurrent(defaultId: string): Promise<{ snapshotDigest: string }> {
    const row = await this.readCandidate(defaultId);
    if (!row?.content) throw new Error('default is missing');
    return {
      snapshotDigest: sha256(await this.snapshotBytes(row.content)),
    };
  }

  private async discover(manifestPath: string): Promise<Record<string, unknown>> {
    const rows = (await this.dataSource.query(
      `SELECT defaults."id" AS "defaultId",
              defaults."whiteboardContent" AS "content",
              bucket."id" AS "targetBucketId"
         FROM "callout_contribution_defaults" defaults
         LEFT JOIN "callout" callout ON callout."contributionDefaultsId" = defaults."id"
         LEFT JOIN "callout_framing" framing ON callout."framingId" = framing."id"
         LEFT JOIN "profile" profile ON framing."profileId" = profile."id"
         LEFT JOIN "storage_bucket" bucket ON profile."storageBucketId" = bucket."id"
        WHERE defaults."whiteboardContent" IS NOT NULL
        ORDER BY defaults."id" ASC`
    )) as CandidateRow[];
    const items: RepairItem[] = [];
    const records: Array<{ token: string; stage: string; reason: string }> = [];
    for (const row of rows) {
      const token = sha256(row.defaultId).slice(0, 32);
      const item = await this.buildItem(row);
      if (item) {
        items.push(item);
        records.push({ token, stage: 'discover', reason: 'eligible' });
      } else {
        records.push({ token, stage: 'discover', reason: 'report_only' });
      }
    }
    const manifest = createManifest(items);
    const digest = await writePrivateManifest(manifestPath, manifest);
    return projectPublicResult(manifest.runToken, digest, records);
  }

  private async buildItem(row: CandidateRow): Promise<RepairItem | undefined> {
    if (!row || !row.targetBucketId || !row.content) {
      return undefined;
    }
    let assetLocators: Record<string, string>;
    let base64: string;
    try {
      base64 = await decompressText(row.content);
      assetLocators = await this.readAssetLocators(Buffer.from(base64, 'base64'));
    } catch {
      return undefined;
    }
    const entries = Object.entries(assetLocators);
    if (entries.length === 0) return undefined;

    const templates = await this.matchingTemplates(assetLocators);
    if (templates.length !== 1) return undefined;
    const sources = await this.readSources(entries.map(([, locator]) => locator));
    if (sources.size !== entries.length) return undefined;
    if (
      entries.every(([, locator]) => sources.get(locator)?.storageBucketId === row.targetBucketId)
    ) {
      return undefined;
    }
    const originalSnapshotDigest = sha256(Buffer.from(base64, 'base64'));
    const assets: RepairAsset[] = entries
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([fileId, sourceId]) => {
        const source = sources.get(sourceId)!;
        return {
          fileId,
          sourceId,
          expectedExternalID: source.externalID,
          externalReference: createRepairReference(
            row.defaultId,
            originalSnapshotDigest,
            row.targetBucketId!,
            fileId,
            source.externalID
          ),
        };
      });
    return {
      token: sha256(row.defaultId).slice(0, 32),
      defaultId: row.defaultId,
      targetBucketId: row.targetBucketId,
      originalContent: row.content,
      originalSnapshotDigest,
      templateId: templates[0].id,
      templateSnapshotDigest: templates[0].snapshotDigest,
      templateAssetRefsDigest: templates[0].assetRefsDigest,
      assets,
    };
  }

  private async readCandidate(defaultId: string): Promise<CandidateRow | undefined> {
    const rows = (await this.dataSource.query(
      `SELECT defaults."id" AS "defaultId",
              defaults."whiteboardContent" AS "content",
              bucket."id" AS "targetBucketId"
         FROM "callout_contribution_defaults" defaults
         LEFT JOIN "callout" callout ON callout."contributionDefaultsId" = defaults."id"
         LEFT JOIN "callout_framing" framing ON callout."framingId" = framing."id"
         LEFT JOIN "profile" profile ON framing."profileId" = profile."id"
         LEFT JOIN "storage_bucket" bucket ON profile."storageBucketId" = bucket."id"
        WHERE defaults."id" = $1`,
      [defaultId]
    )) as CandidateRow[];
    return rows[0];
  }

  private async validateManifestItem(item: RepairItem): Promise<void> {
    const bytes = await this.snapshotBytes(item.originalContent);
    if (sha256(bytes) !== item.originalSnapshotDigest) {
      throw new Error('manifest original snapshot digest mismatch');
    }
    const locators = await this.readAssetLocators(bytes);
    const locatorEntries = Object.entries(locators);
    if (
      locatorEntries.length !== item.assets.length ||
      new Set(item.assets.map(asset => asset.fileId)).size !== item.assets.length
    ) {
      throw new Error('manifest asset map mismatch');
    }
    for (const asset of item.assets) {
      if (locators[asset.fileId] !== asset.sourceId) {
        throw new Error('manifest asset map mismatch');
      }
    }
  }

  private async matchingTemplates(assetLocators: Record<string, string>) {
    const rows = (await this.dataSource.query(
      `SELECT template."id" AS "id", whiteboard."contentPointer" AS "contentPointer"
         FROM "template" template
         JOIN "whiteboard" whiteboard ON template."whiteboardId" = whiteboard."id"
        WHERE template."type" = 'WHITEBOARD'
          AND whiteboard."contentPointer" IS NOT NULL`
    )) as Array<{ id: string; contentPointer: string }>;
    const matches: Array<{
      id: string;
      snapshotDigest: string;
      assetRefsDigest: string;
    }> = [];
    for (const row of rows) {
      const templateBytes = await this.fileServiceAdapter.getDocumentContent(
        row.contentPointer
      );
      const templateAssets = await this.readAssetLocators(templateBytes);
      if (
        Object.entries(assetLocators).every(
          ([fileId, locator]) => templateAssets[fileId] === locator
        )
      ) {
        matches.push({
          id: row.id,
          snapshotDigest: sha256(templateBytes),
          assetRefsDigest: sha256(canonicalJson(templateAssets)),
        });
      }
    }
    return matches;
  }

  private async readSources(ids: string[]) {
    const rows = (await this.dataSource.query(
      `SELECT "id", "externalID" AS "externalID", "storageBucketId" AS "storageBucketId"
         FROM "file" WHERE "id" = ANY($1)`,
      [ids]
    )) as Array<{ id: string; externalID: string; storageBucketId: string }>;
    return new Map<string, { id: string; externalID: string; storageBucketId: string }>(
      rows.map(row => [row.id, row])
    );
  }

  private async snapshotBytes(content: string): Promise<Buffer> {
    return Buffer.from(await decompressText(content), 'base64');
  }

  private async readAssetLocators(bytes: Buffer): Promise<Record<string, string>> {
    const fork = await loadWhiteboardFork();
    const document = new Y.Doc();
    try {
      Y.applyUpdateV2(document, bytes);
      return fork.readAssetLocators(document.getMap(fork.FILES)) as Record<
        string,
        string
      >;
    } finally {
      document.destroy();
    }
  }

}
