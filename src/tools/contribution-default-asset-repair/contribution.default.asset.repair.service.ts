import { createRequire } from 'node:module';
import { compressText, decompressText } from '@common/utils/compression.util';
import { loadWhiteboardFork } from '@domain/common/whiteboard/whiteboard.fork';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { DataSource } from 'typeorm';
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
  targetAuthorizationId: string | null;
};

@Injectable()
export class ContributionDefaultAssetRepairService implements RepairPort {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fileServiceAdapter: FileServiceAdapter
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
        const result = await coordinator.apply(item);
        records.push({ token: item.token, stage: 'apply', reason: result.state });
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
        content: '',
        snapshotDigest: '',
        templateId: '',
        templateAssetRefsDigest: '',
        targetBucketId: '',
        targetAuthorizationId: '',
        assets: [],
      };
    }
    const templates = await this.matchingTemplates(
      Object.fromEntries(item.assets.map(asset => [asset.fileId, asset.sourceId]))
    );
    const sources = await this.readSources(item.assets.map(asset => asset.sourceId));
    let snapshotDigest = '';
    if (current.content === item.originalContent) {
      snapshotDigest = sha256(await decompressText(current.content));
    }
    return {
      content: current.content,
      snapshotDigest,
      templateId: templates.length === 1 ? templates[0].id : '',
      templateAssetRefsDigest:
        templates.length === 1 ? templates[0].assetRefsDigest : '',
      targetBucketId: current.targetBucketId ?? '',
      targetAuthorizationId: current.targetAuthorizationId ?? '',
      assets: item.assets.flatMap(asset => {
        const source = sources.get(asset.sourceId);
        return source
          ? [{ sourceId: asset.sourceId, externalID: source.externalID }]
          : [];
      }),
    };
  }

  async copy(item: RepairItem, asset: RepairAsset) {
    const result = await this.fileServiceAdapter.copyDocument({
      sourceId: asset.sourceId,
      destinationBucketId: item.targetBucketId,
      authorizationId: item.targetAuthorizationId,
      externalReference: asset.externalReference,
    });
    return {
      ...result,
      externalReference: asset.externalReference,
      storageBucketId: item.targetBucketId,
      createdDirectly: result.reused === false,
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
      fork.writeAssetLocators(document.getMap(fork.FILES), locators, { prune: true });
      const intended = Buffer.from(Y.encodeStateAsUpdateV2(document)).toString('base64');
      return {
        content: await compressText(intended),
        snapshotDigest: sha256(intended),
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
    const rows = await this.dataSource.query(
      `UPDATE "callout_contribution_defaults"
          SET "whiteboardContent" = $1
        WHERE "id" = $2 AND "whiteboardContent" = $3
        RETURNING "id"`,
      [intendedContent, defaultId, originalContent]
    );
    return rows.length === 1;
  }

  async readContent(defaultId: string): Promise<string> {
    const rows = await this.dataSource.query(
      'SELECT "whiteboardContent" AS "content" FROM "callout_contribution_defaults" WHERE "id" = $1',
      [defaultId]
    );
    if (rows.length !== 1 || typeof rows[0].content !== 'string') {
      throw new Error('default is missing');
    }
    return rows[0].content;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.fileServiceAdapter.deleteDocument(documentId);
  }

  private async discover(manifestPath: string): Promise<Record<string, unknown>> {
    const rows = (await this.dataSource.query(
      `SELECT defaults."id" AS "defaultId",
              defaults."whiteboardContent" AS "content",
              bucket."id" AS "targetBucketId",
              bucket."authorizationId" AS "targetAuthorizationId"
         FROM "callout_contribution_defaults" defaults
         JOIN "callout" callout ON callout."contributionDefaultsId" = defaults."id"
         JOIN "callout_framing" framing ON callout."framingId" = framing."id"
         JOIN "profile" profile ON framing."profileId" = profile."id"
         LEFT JOIN "storage_bucket" bucket ON profile."storageBucketId" = bucket."id"
        WHERE defaults."whiteboardContent" IS NOT NULL
        ORDER BY defaults."id" ASC`
    )) as CandidateRow[];
    const items: RepairItem[] = [];
    const records: Array<{ token: string; stage: string; reason: string }> = [];
    for (const row of rows) {
      const token = sha256(row.defaultId).slice(0, 32);
      const item = await this.buildItem(row.defaultId, row);
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

  private async buildItem(
    defaultId: string,
    knownRow?: CandidateRow
  ): Promise<RepairItem | undefined> {
    const row = knownRow ?? (await this.readCandidate(defaultId));
    if (
      !row ||
      !row.targetBucketId ||
      !row.targetAuthorizationId ||
      !row.content
    ) {
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
    const originalSnapshotDigest = sha256(base64);
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
      targetAuthorizationId: row.targetAuthorizationId,
      originalContent: row.content,
      originalSnapshotDigest,
      templateId: templates[0].id,
      templateAssetRefsDigest: templates[0].assetRefsDigest,
      assets,
    };
  }

  private async readCandidate(defaultId: string): Promise<CandidateRow | undefined> {
    const rows = (await this.dataSource.query(
      `SELECT defaults."id" AS "defaultId",
              defaults."whiteboardContent" AS "content",
              bucket."id" AS "targetBucketId",
              bucket."authorizationId" AS "targetAuthorizationId"
         FROM "callout_contribution_defaults" defaults
         JOIN "callout" callout ON callout."contributionDefaultsId" = defaults."id"
         JOIN "callout_framing" framing ON callout."framingId" = framing."id"
         JOIN "profile" profile ON framing."profileId" = profile."id"
         LEFT JOIN "storage_bucket" bucket ON profile."storageBucketId" = bucket."id"
        WHERE defaults."id" = $1`,
      [defaultId]
    )) as CandidateRow[];
    return rows[0];
  }

  private async matchingTemplates(assetLocators: Record<string, string>) {
    const rows = (await this.dataSource.query(
      `SELECT template."id" AS "id", whiteboard."contentPointer" AS "contentPointer"
         FROM "template" template
         JOIN "whiteboard" whiteboard ON template."whiteboardId" = whiteboard."id"
        WHERE template."type" = 'WHITEBOARD'
          AND whiteboard."contentPointer" IS NOT NULL`
    )) as Array<{ id: string; contentPointer: string }>;
    const matches: Array<{ id: string; assetRefsDigest: string }> = [];
    for (const row of rows) {
      try {
        const templateAssets = await this.readAssetLocators(
          await this.fileServiceAdapter.getDocumentContent(row.contentPointer)
        );
        if (
          Object.entries(assetLocators).every(
            ([fileId, locator]) => templateAssets[fileId] === locator
          )
        ) {
          matches.push({
            id: row.id,
            assetRefsDigest: sha256(canonicalJson(templateAssets)),
          });
        }
      } catch {
        continue;
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
