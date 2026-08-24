import { createRequire } from 'node:module';
import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  CollaborationLifecycleService,
  CollaborationMetadata,
  CollaborationMetadataUpdate,
} from '@domain/common/collaboration-metadata';
import { IProfile } from '@domain/common/profile';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import type * as Yjs from 'yjs';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { LicenseService } from '../license/license.service';
import { ProfileService } from '../profile/profile.service';
import {
  findUnresolvedLiveImage,
  whiteboardSceneToYjsV2State,
} from './conversion';
import { CreateWhiteboardInput } from './dto/whiteboard.dto.create';
import { UpdateWhiteboardInput } from './dto/whiteboard.dto.update';
import { Whiteboard } from './whiteboard.entity';
import { loadWhiteboardFork, WhiteboardFork } from './whiteboard.fork';
import { IWhiteboard } from './whiteboard.interface';

/**
 * Native-CJS `yjs` — the SAME single instance the CJS headless fork (`loadWhiteboardFork`)
 * resolves, in production (server is CJS: `import * as Y` compiles to `require('yjs')`) AND
 * under the Vitest ESM runner (where a bare `import` would resolve to `yjs.mjs`, a SECOND
 * instance). `rehomeSnapshotAssets` decodes a snapshot into a `Y.Doc` and hands it to the
 * fork's `readAssetLocators`/`writeAssetLocators`, so decode + fork MUST share one runtime;
 * `createRequire(__filename)` is zero semantic change in compiled CommonJS and removes the
 * cross-runtime discrepancy at this fork-crossing site under test.
 */
const Y = createRequire(__filename)('yjs') as typeof import('yjs');

@Injectable()
export class WhiteboardService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private communityResolverService: CommunityResolverService,
    private licenseService: LicenseService,
    private collaborationLifecycleService: CollaborationLifecycleService,
    private fileServiceAdapter: FileServiceAdapter,
    private authorizationService: AuthorizationService,
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService
  ) {}

  async createWhiteboard(
    whiteboardData: CreateWhiteboardInput,
    storageAggregator: IStorageAggregator,
    actorContext: ActorContext
  ): Promise<IWhiteboard> {
    // The initial content arrives server-side as a base64 Yjs-V2 snapshot (the
    // single CRDT representation — never an Excalidraw scene/JSON) on client
    // create, from-template, and duplicate. It is NO LONGER stored inline — it is
    // written to the whiteboard's own bucket below (R1/R2/FR-005). Hold it aside;
    // `Whiteboard.create` no longer carries it, nor the source-copy pointer.
    const { content, sourceWhiteboardID, ...entityData } = whiteboardData;

    // XOR by PRESENCE (not truthiness): `content` and `sourceWhiteboardID` are
    // mutually exclusive. A create that supplies BOTH is malformed — reject BEFORE
    // any DB / file / collab side effect. `content === ''` (or an encoded-empty
    // snapshot) still counts as present, so a source clone can never smuggle a
    // second, untrusted content representation alongside it.
    if (content != null && sourceWhiteboardID != null) {
      throw new ValidationException(
        'A whiteboard create must supply EITHER content OR sourceWhiteboardID, not both',
        LogContext.WHITEBOARDS
      );
    }

    // Resolve the initial snapshot + the authorization boundary for its embedded
    // media. The two branches carry DIFFERENT trust:
    //  - `sourceWhiteboardID` (clone / Save-as-Template): the service authorizes
    //    READ on the source it dereferences HERE (the resolver only authorizes
    //    CREATE on the destination parent); embedded-media locators are then
    //    constrained to the source's OWN bucket. A source with no stored snapshot
    //    seeds an EMPTY board — never a fallback to client `content`.
    //  - direct `content`: locators are untrusted → per-document READ under the
    //    initiating actor (identical rule to a live content replacement).
    let initialScene: string | undefined;
    let sourceBucketId: string | undefined;
    if (sourceWhiteboardID != null) {
      const source = await this.getWhiteboardOrFail(sourceWhiteboardID, {
        loadEagerRelations: false,
        relations: { authorization: true, profile: { storageBucket: true } },
      });
      this.authorizationService.grantAccessOrFail(
        actorContext,
        source.authorization,
        AuthorizationPrivilege.READ,
        `create whiteboard from source: ${sourceWhiteboardID}`
      );
      sourceBucketId = source.profile?.storageBucket?.id;
      // Fail CLOSED: the source-clone media constraint ("every locator must live in
      // the source's own bucket") is only enforceable when we know that bucket. An
      // unresolved source bucket (legacy row / partial load) must NOT silently fall
      // through to the untrusted per-document branch — that would drop the strict gate
      // undetected. A source whiteboard always has a bucket, so this is a data-integrity
      // guard, never a normal path.
      if (sourceBucketId == null) {
        throw new EntityNotInitializedException(
          'Source whiteboard storage bucket unresolved; cannot constrain clone media to the source bucket',
          LogContext.WHITEBOARDS,
          { sourceWhiteboardID }
        );
      }
      initialScene =
        (await this.getWhiteboardContent(sourceWhiteboardID)) || undefined;
    } else {
      initialScene = content ?? undefined;
    }

    // Phase 1: build entity tree in memory (no file-service-go calls).
    const whiteboard: IWhiteboard = Whiteboard.create({
      ...entityData,
    });
    whiteboard.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.WHITEBOARD
    );
    // `ActorContext.actorID` is typed `string` and defaults to '' for an empty/anonymous
    // context; `|| undefined` keeps a malformed empty-string out of the UUID column (NULL).
    whiteboard.createdBy = actorContext.actorID || undefined;
    whiteboard.contentUpdatePolicy = ContentUpdatePolicy.CONTRIBUTORS;

    whiteboard.profile = await this.profileService.createProfile(
      whiteboardData.profile ?? {
        displayName: 'Whiteboard',
      },
      ProfileType.WHITEBOARD,
      storageAggregator
    );
    await this.profileService.addOrUpdateTagsetOnProfile(whiteboard.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    whiteboard.previewSettings = {
      mode: whiteboardData.previewSettings?.mode ?? WhiteboardPreviewMode.AUTO,
      coordinates: whiteboardData.previewSettings?.coordinates ?? null,
    };

    // Phase 2: persist + materialize. The shared helper runs the file-service
    // work and rolls back the saved entity on failure so callers receive a
    // fully-materialized whiteboard or a thrown error, never a half-state.
    const saved = await this.whiteboardRepository.save(whiteboard);
    await this.profileService.materializeProfileContentAndVisualsOrRollback(
      saved.profile,
      whiteboardData.profile?.visuals,
      [VisualType.CARD, VisualType.WHITEBOARD_PREVIEW],
      () => this.deleteWhiteboard(saved.id)
    );

    // Phase 3: persist the editor's Yjs-V2 snapshot verbatim into the new
    // whiteboard's own bucket. `initialScene` is base64-encoded Yjs CRDT state (the
    // single representation everywhere — never an Excalidraw scene/JSON). Embedded
    // media is re-homed into this bucket by operating on the snapshot's own `files`
    // Y.Map, not a reconstructed scene. Release A (staged rollout): EVERY create
    // seeds a real snapshot — an empty create is encoded as the canonical empty
    // Y.Doc (`whiteboardSceneToYjsV2State('')`) so the row never carries a
    // NULL/dangling pointer (the admission-pointer invariant). Release B fails-
    // closed on any NULL/blank pointer under its write fence but leaves the column
    // NULLABLE for the transient new-row window. The room materializes empty +
    // editable (FR-010) either way.
    try {
      const storageBucketId = saved.profile.storageBucket?.id;
      if (!storageBucketId) {
        throw new EntityNotInitializedException(
          'Whiteboard storage bucket not initialized when writing initial snapshot',
          LogContext.WHITEBOARDS,
          { whiteboardId: saved.id }
        );
      }
      let snapshot: Buffer;
      if (initialScene) {
        // Create's outer catch deletes the whole whiteboard on failure, which cascades a
        // bucket cleanup, so the copied `createdTargetLocators` need no separate
        // compensation here (unlike the pre-existing-whiteboard UPDATE path).
        ({ snapshot } = await this.rehomeSnapshotAssets(
          Buffer.from(initialScene, 'base64'),
          storageBucketId,
          { actorContext, sourceBucketId }
        ));
      } else {
        snapshot = Buffer.from(await whiteboardSceneToYjsV2State(''));
      }
      const result = await this.fileServiceAdapter.createSnapshotInBucket(
        snapshot,
        storageBucketId
      );
      saved.contentPointer = result.id;
      saved.contentVersion = 0;
      await this.whiteboardRepository.save(saved);
    } catch (error) {
      await this.deleteWhiteboard(saved.id).catch(rollbackError => {
        const stack =
          rollbackError instanceof Error ? (rollbackError.stack ?? '') : '';
        this.logger.error?.(
          {
            message:
              'Rollback after WB snapshot write / reupload failure also failed',
            whiteboardId: saved.id,
            rollbackError: String(rollbackError),
          },
          stack,
          LogContext.WHITEBOARDS
        );
      });
      throw error;
    }
    return saved;
  }

  /**
   * Authorized locator-only re-home of a Yjs-V2 whiteboard snapshot's embedded media
   * into `targetBucketId` (006-collab-content-unification write-path). The snapshot's
   * asset map is the physical `FILES` Y.Map of opaque file-service locator STRINGS — the
   * logical API name is `assets`; the physical root name `files` is a FROZEN legacy schema
   * name from the BinaryFileData era (renaming it is a stored-format break, not cleanup;
   * see whiteboard.fork). For every locator this loads its source document, AUTHORIZES it,
   * and — unless it already lives in the target bucket — copies it there (content-addressed;
   * `skipDedup` so the copy is target-OWNED, never a foreign dedup row). Authorization is
   * caller-scoped:
   *   - source clone (`sourceBucketId` set): the locator's document MUST live in that exact
   *     resolver-authorized source bucket — a foreign locator is a crafted reference → reject;
   *   - direct untrusted content: per-document READ under `actorContext` (same rule as a
   *     live content replacement).
   * PHASE 1 authorizes + copies EVERY locator; PHASE 2 rewrites the map in ONE `doc.transact`
   * under `LOCAL_ORIGIN`. A copy failure before the rewrite best-effort deletes the fresh
   * target copies and publishes NO locator (the caller's entity rollback removes a
   * half-created whiteboard). An empty asset map returns the snapshot verbatim (no lookups).
   * The loaded doc is edited IN PLACE (never decode→edit→re-encode, which would discard CRDT
   * lineage / deletion / reconciliation state).
   */
  private async rehomeSnapshotAssets(
    snapshot: Uint8Array,
    targetBucketId: string,
    authz: { actorContext: ActorContext; sourceBucketId?: string }
  ): Promise<{ snapshot: Buffer; createdTargetLocators: string[] }> {
    // Returns the re-homed snapshot AND the file-service ids of any media copied into
    // `targetBucketId` on this call. A failure DURING re-home is compensated here (the
    // catch below best-effort deletes the fresh copies). A failure AFTER this returns
    // (checkpoint write / entity save) has no such cascade on the UPDATE path, so the
    // caller MUST delete `createdTargetLocators` itself; create relies on its own
    // whiteboard/bucket-delete cascade and may ignore them.
    const fork = await loadWhiteboardFork();
    const doc = new Y.Doc();
    const createdTargetLocators: string[] = [];
    try {
      Y.applyUpdateV2(doc, snapshot);
      const yAssets = doc.getMap<unknown>(fork.FILES);
      // `readAssetLocators` is loud on legacy/invalid (non-string) values.
      const current = fork.readAssetLocators(yAssets) as Record<string, string>;

      // Desired-snapshot preflight (shared with the live-replace path): every live
      // image element that names a fileId MUST have a matching asset locator here.
      // This runs BEFORE the empty-map early return and BEFORE any copy — a snapshot
      // carrying an image(fileId=f1) with no assets entry would otherwise slip through
      // as "no assets to re-home" and land an unresolvable image (ed-yjs: a prune-write
      // over such a map is silent, not an error). It examines the DESIRED elements, so a
      // locator whose only referencing image was removed by this snapshot is not required.
      this.assertDesiredAssetsResolveImages(doc, fork, current);

      const fileIds = Object.keys(current);
      if (fileIds.length === 0) {
        return { snapshot: Buffer.from(snapshot), createdTargetLocators };
      }

      // PHASE 1: authorize + copy EVERY asset into the target bucket first
      // (abort-before-mutation — the Y.Map is not touched until all copies succeed).
      const desired: Record<string, string> = {};
      for (const fileId of fileIds) {
        const sourceLocator = current[fileId];
        const sourceDocument = await this.documentService.getDocumentOrFail(
          sourceLocator,
          {
            loadEagerRelations: false,
            relations: { authorization: true, storageBucket: true },
          }
        );
        const sourceDocumentBucketId = sourceDocument.storageBucket?.id;

        if (authz.sourceBucketId != null) {
          // Source clone: every locator MUST belong to the authorized source bucket.
          if (sourceDocumentBucketId !== authz.sourceBucketId) {
            throw new ForbiddenException(
              'Whiteboard source-copy references a document outside the authorized source bucket',
              LogContext.WHITEBOARDS,
              { fileId }
            );
          }
        } else {
          // Direct untrusted content: per-document READ under the initiating actor.
          this.authorizationService.grantAccessOrFail(
            authz.actorContext,
            sourceDocument.authorization,
            AuthorizationPrivilege.READ,
            `re-home whiteboard media document: ${sourceLocator}`
          );
        }

        if (sourceDocumentBucketId === targetBucketId) {
          // Already target-owned — retain the locator, do not copy.
          desired[fileId] = sourceLocator;
          continue;
        }
        const copied = await this.storageBucketService.copyDocumentToBucket(
          targetBucketId,
          sourceDocument,
          authz.actorContext.actorID || undefined,
          true // skipDedup: the copy must be target-owned, never a foreign dedup row
        );
        createdTargetLocators.push(copied.id);
        desired[fileId] = copied.id;
      }

      // PHASE 2: all copies succeeded → rewrite the asset map in ONE transaction.
      doc.transact(() => {
        fork.writeAssetLocators(yAssets, desired, { prune: true });
      }, fork.LOCAL_ORIGIN);
      return {
        snapshot: Buffer.from(Y.encodeStateAsUpdateV2(doc)),
        createdTargetLocators,
      };
    } catch (error) {
      // Pre-rewrite failure: best-effort delete the fresh target copies; publish NO locator.
      await Promise.all(
        createdTargetLocators.map(id =>
          this.fileServiceAdapter.deleteDocument(id).catch(() => undefined)
        )
      );
      throw error;
    } finally {
      doc.destroy();
    }
  }

  /**
   * Desired-snapshot consistency preflight, shared by creation/source-copy (here) and
   * the live whole-scene replacement path. For every non-deleted IMAGE element carrying
   * a non-null `fileId`, the snapshot's asset map MUST hold a valid (non-empty string)
   * locator for that `fileId`. A missing/invalid reference is rejected BEFORE any asset
   * copy or Scene mutation.
   *
   * Why it examines the DESIRED elements (this exact snapshot), not a prior scene: a
   * whole-scene replacement legitimately drops elements, so a locator whose only
   * referencing image is gone here should be pruned — but a NEW image that names an
   * absent asset must never land, because `setAssetLocators(...,{prune:true})` removes
   * unreferenced locators silently (no write/encode error; measured in ed-yjs), which
   * would otherwise leave a live image pointing at nothing.
   */
  private assertDesiredAssetsResolveImages(
    doc: Yjs.Doc,
    fork: WhiteboardFork,
    assets: Record<string, string>
  ): void {
    // Shared cold-load image→asset integrity invariant (also enforced by the Release-A
    // migration verifier) — a live image element whose fileId has no file-map locator.
    const offender = findUnresolvedLiveImage(doc, fork, assets);
    if (offender) {
      throw new ValidationException(
        'Whiteboard snapshot references an image asset that is missing from its file map',
        LogContext.WHITEBOARDS,
        { elementId: offender.elementId, fileId: offender.fileId }
      );
    }
  }

  async getWhiteboardOrFail(
    whiteboardID: string,
    options?: FindOneOptions<Whiteboard>
  ): Promise<IWhiteboard | never> {
    const whiteboard = await this.whiteboardRepository.findOne({
      where: { id: whiteboardID },
      ...options,
    });

    if (!whiteboard)
      throw new EntityNotFoundException(
        `Not able to locate Whiteboard with the specified ID: ${whiteboardID}`,
        LogContext.SPACES
      );
    return whiteboard;
  }

  async deleteWhiteboard(whiteboardID: string): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardID, {
      relations: {
        authorization: true,
        profile: true,
      },
    });

    if (!whiteboard.profile) {
      throw new RelationshipNotFoundException(
        `Profile not found on whiteboard: '${whiteboard.id}'`,
        LogContext.SPACES
      );
    }

    if (!whiteboard.authorization) {
      throw new RelationshipNotFoundException(
        `Authorization not found on whiteboard: '${whiteboard.id}'`,
        LogContext.SPACES
      );
    }

    await this.profileService.deleteProfile(whiteboard.profile.id);
    await this.authorizationPolicyService.delete(whiteboard.authorization);

    // Owner-driven lifecycle (FR-006/FR-023): the whiteboard is the leaf every
    // cascade path (callout framing / contribution / direct) passes through.
    // Remove the leaf and record `document.deleted` in the SAME transaction,
    // AFTER the profile/bucket/auth cascade above. The row is transactionally
    // enqueued; the dispatcher delivers it out-of-band at-least-once (idempotent
    // downstream). This closes the DB-remove -> emit window the old
    // fire-and-forget emit had.
    //
    // BOUNDARY (not solved here): the profile/bucket/auth cascade above deletes
    // the checkpoint blob via an external file-service HTTP call that cannot
    // join a DB tx, and it runs BEFORE this transaction. A crash after that
    // cascade but before remove+enqueue can leave a surviving aggregate with
    // missing storage and no event — pre-existing delete-saga debt, deliberately
    // out of this slice's scope (this outbox is not a deletion saga).
    const deletedWhiteboard =
      await this.whiteboardRepository.manager.transaction(async manager => {
        const removed = await manager.remove(whiteboard as Whiteboard);
        await this.collaborationLifecycleService.enqueueDocumentDeleted(
          manager,
          whiteboardID
        );
        return removed;
      });
    deletedWhiteboard.id = whiteboardID;

    return deletedWhiteboard;
  }

  async updateWhiteboard(
    whiteboardInput: IWhiteboard,
    updateWhiteboardData: UpdateWhiteboardInput
  ): Promise<IWhiteboard> {
    let whiteboard = await this.getWhiteboardOrFail(whiteboardInput.id, {
      relations: {
        profile: true,
      },
    });

    if (updateWhiteboardData.profile) {
      whiteboard.profile = await this.profileService.updateProfile(
        whiteboard.profile,
        updateWhiteboardData.profile
      );
    }

    if (updateWhiteboardData.contentUpdatePolicy) {
      whiteboard.contentUpdatePolicy = updateWhiteboardData.contentUpdatePolicy;
    }

    if (updateWhiteboardData.previewSettings) {
      if (updateWhiteboardData.previewSettings.mode !== undefined) {
        whiteboard.previewSettings.mode =
          updateWhiteboardData.previewSettings.mode;
      }
      if (updateWhiteboardData.previewSettings.coordinates !== undefined) {
        whiteboard.previewSettings.coordinates =
          updateWhiteboardData.previewSettings.coordinates;
      }
    }

    whiteboard = await this.save(whiteboard);

    return whiteboard;
  }

  /**
   * Server-side whiteboard content set (template / framing-content edit — NOT a
   * live collab session). Re-homes embedded media into the whiteboard's bucket,
   * converts the scene to a Yjs-V2 snapshot, and replaces the stored snapshot in
   * the bucket (R1/R2/FR-005) — the inline `content` column is unmapped (retained
   * in Release A, dropped in Release B). The content
   * originates server-side here, so it is persisted directly; the next open seeds
   * from this snapshot. The superseded snapshot file is deleted (latest-only).
   */
  async updateWhiteboardContent(
    whiteboardInputId: string,
    updateWhiteboardContent: string,
    actorContext: ActorContext
  ): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInputId, {
      loadEagerRelations: false,
      relations: {
        profile: { storageBucket: true },
      },
      select: {
        id: true,
        contentPointer: true,
        profile: {
          id: true,
          storageBucket: { id: true },
        },
      },
    });
    if (!whiteboard?.profile?.storageBucket) {
      throw new EntityNotInitializedException(
        `Profile / storage bucket not initialized on whiteboard: '${whiteboard.id}'`,
        LogContext.COLLABORATION
      );
    }

    // `updateWhiteboardContent` is a base64-encoded Yjs-V2 snapshot (the single CRDT
    // representation — no Excalidraw scene/JSON). Re-home embedded media through the
    // SAME authorized, locator-native owner the create/clone flow uses
    // (`rehomeSnapshotAssets`): the snapshot's FILES Y.Map holds opaque file-service
    // locator strings, and every locator is per-document READ-authorized under the
    // initiating actor and copied into this whiteboard's own bucket if it lives
    // elsewhere. Direct untrusted content → no `sourceBucketId` (per-document READ),
    // matching the live-replacement rule. One owner for both create and update — the
    // BinaryFileData-shaped `rehomeSnapshotMedia` no-op path is gone.
    const { snapshot, createdTargetLocators } = await this.rehomeSnapshotAssets(
      Buffer.from(updateWhiteboardContent, 'base64'),
      whiteboard.profile.storageBucket.id,
      { actorContext }
    );
    const previousPointer = whiteboard.contentPointer;
    let newCheckpointId: string | undefined;
    try {
      const result = await this.fileServiceAdapter.createSnapshotInBucket(
        snapshot,
        whiteboard.profile.storageBucket.id
      );
      // Only a NEWLY-created checkpoint is ours to compensate. createSnapshotInBucket
      // can DEDUP (`reused: true`) to an existing same-bucket row — possibly the current
      // `previousPointer` for an unchanged update, or a row owned by another whiteboard —
      // which must NEVER be deleted (storage.bucket.service guards cleanup with
      // `!result.reused`). Defensively also refuse to compensate the previous pointer.
      newCheckpointId =
        result.reused === false && result.id !== previousPointer
          ? result.id
          : undefined;
      whiteboard.contentPointer = result.id;
      const saved = await this.save(whiteboard);

      // Success: the superseded previous snapshot is now unreferenced — best-effort delete.
      if (previousPointer && previousPointer !== result.id) {
        await this.fileServiceAdapter
          .deleteDocument(previousPointer)
          .catch(error => {
            this.logger.warn?.(
              {
                message: 'Failed to delete superseded whiteboard snapshot',
                whiteboardId: whiteboard.id,
                previousPointer,
                error: String(error),
              },
              LogContext.WHITEBOARDS
            );
          });
      }
      return saved;
    } catch (error) {
      // The whiteboard already exists, so there is NO entity-cascade cleanup as on create.
      // Compensate at the earliest owner: best-effort delete the media rehomeSnapshotAssets
      // copied into this bucket AND the freshly-written checkpoint, so a failed update leaks
      // neither target-owned media nor an orphan snapshot. `contentPointer` was never
      // persisted (the save failed or never ran), so the PREVIOUS pointer stays the durable
      // owner. Preserve + rethrow the original error.
      const orphans = [...createdTargetLocators];
      if (newCheckpointId) {
        orphans.push(newCheckpointId);
      }
      await Promise.all(
        orphans.map(id =>
          this.fileServiceAdapter.deleteDocument(id).catch(cleanupError => {
            this.logger.warn?.(
              {
                message:
                  'Failed to clean up orphaned asset/checkpoint after whiteboard content-update failure',
                whiteboardId: whiteboard.id,
                orphanId: id,
                error: String(cleanupError),
              },
              LogContext.WHITEBOARDS
            );
          })
        )
      );
      throw error;
    }
  }

  /**
   * Reads a whiteboard's stored content as a base64-encoded Yjs-V2 snapshot — the
   * single CRDT representation, kept opaque (no Excalidraw scene/JSON, no
   * decode/re-encode). The snapshot lives in the whiteboard's own file-service
   * bucket and is located by `contentPointer`; this re-reads it the same way the
   * memo-content loader / input-creator builders do (file-service
   * `content-batch`), NOT the inline column (unmapped — retained in Release A,
   * dropped in Release B; 006-collab-content-unification).
   *
   * Server-side copy path (#29): the "Save as Template" flow can no longer read a
   * live whiteboard's content on the client, so the server reads the source
   * whiteboard's snapshot here and seeds the new template whiteboard with it.
   *
   * A whiteboard that was never edited (no `contentPointer`) — or whose snapshot is
   * missing — returns `''`, matching the empty/unset-pointer convention: a new
   * whiteboard seeded with `''` materializes empty + editable (FR-010), exactly as
   * a fresh whiteboard created with no content.
   *
   * @throws {EntityNotFoundException} when the whiteboard does not exist.
   */
  async getWhiteboardContent(whiteboardId: string): Promise<string> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardId, {
      loadEagerRelations: false,
      select: {
        id: true,
        contentPointer: true,
      },
    });
    if (!whiteboard.contentPointer) {
      return '';
    }
    const [item] = await this.fileServiceAdapter.getContentBatch([
      whiteboard.contentPointer,
    ]);
    if (!item?.found || !item.contentBase64) {
      return '';
    }
    // Already base64 from the content-batch endpoint — returned verbatim.
    return item.contentBase64;
  }

  /**
   * Reads the unified collaboration metadata/index for a whiteboard (FR-005).
   * Only the index + the entity's own `authorizationPolicyId` (=
   * `authorizationId`) are returned; the blob never leaves the server here.
   * @throws {EntityNotFoundException} when the whiteboard does not exist.
   */
  async getCollaborationMetadata(
    whiteboardId: string
  ): Promise<CollaborationMetadata> {
    const whiteboard = (await this.getWhiteboardOrFail(whiteboardId, {
      loadEagerRelations: false,
      relations: {
        authorization: true,
        profile: { storageBucket: true },
      },
      select: {
        id: true,
        contentVersion: true,
        contentPointer: true,
        authorization: { id: true },
        profile: { id: true, storageBucket: { id: true } },
      },
    })) as Whiteboard;

    return {
      // Return the persisted contract version (`contentVersion`), NOT the
      // TypeORM `@VersionColumn`, so a reloaded room sees the version it owns.
      version: whiteboard.contentVersion ?? 0,
      // Coerce a DB NULL (a freshly-created row before its initial snapshot
      // pointer is attached) to `undefined` so the contract reply shape stays
      // `string | undefined`. The pointer column is legitimately nullable for
      // this transient window; Release B fails-closed on NULL/blank under the
      // write fence, it does not make the column NOT NULL.
      contentPointer: whiteboard.contentPointer ?? undefined,
      authorizationPolicyId: whiteboard.authorization?.id,
      // The whiteboard's OWN storage bucket (via its profile) — the collab
      // service persists this doc's snapshot into this bucket, not a flat one.
      storageBucketId: whiteboard.profile?.storageBucket?.id,
    };
  }

  /**
   * Upserts the unified collaboration metadata/index for a whiteboard
   * (FR-003): the contract `version` + `contentPointer`. The room
   * owns the version (`contracts/persistence-ports.md`), so the value it sends
   * is PERSISTED verbatim into `contentVersion` and round-tripped back on fetch
   * — the server does NOT substitute its own counter. The inherited TypeORM
   * `@VersionColumn` (`version`) keeps its independent optimistic-locking role
   * and is left untouched. The inline blob (`content`) is NOT touched here — it
   * never crosses the unified bus.
   * @throws {EntityNotFoundException} when the whiteboard does not exist.
   */
  async saveCollaborationMetadata(
    whiteboardId: string,
    update: CollaborationMetadataUpdate
  ): Promise<CollaborationMetadata> {
    // Ensure the whiteboard exists (structured not-found upstream) before the
    // index-only write.
    await this.getWhiteboardOrFail(whiteboardId, {
      loadEagerRelations: false,
      select: { id: true },
    });

    // Update only the index columns via the query builder so the
    // content-bearing `@BeforeUpdate` compression hook (and the file-reupload
    // work in the full save path) is NOT triggered for a metadata-only write.
    // The room-owned contract version is persisted verbatim into
    // `contentVersion` (NOT the `@VersionColumn`) so fetch round-trips it.
    //
    // `contentPointer` is produced solely by the checkpoint store's metapointer
    // `Record` (on establishment/recreation); PreRegister and Room.persist omit it.
    // A blank/omitted pointer on a save means UNCHANGED — set it only when a real
    // pointer is present; otherwise preserve the stored one, so a partial or
    // redelivered save never orphans the content.
    const set: { contentVersion: number; contentPointer?: string } = {
      contentVersion: update.version,
    };
    if (update.contentPointer) {
      set.contentPointer = update.contentPointer;
    }
    await this.whiteboardRepository
      .createQueryBuilder()
      .update(Whiteboard)
      .set(set)
      .where('id = :id', { id: whiteboardId })
      .execute();

    // Project the persisted index back into the contract shape rather than
    // returning a partial `IWhiteboard` (only a subset of columns is selected).
    const whiteboard = (await this.getWhiteboardOrFail(whiteboardId, {
      loadEagerRelations: false,
      relations: { authorization: true },
      select: {
        id: true,
        contentVersion: true,
        contentPointer: true,
        authorization: { id: true },
      },
    })) as Whiteboard;

    return {
      version: whiteboard.contentVersion ?? 0,
      contentPointer: whiteboard.contentPointer ?? undefined,
      authorizationPolicyId: whiteboard.authorization?.id,
    };
  }

  public async isMultiUser(whiteboardId: string): Promise<boolean> {
    const license =
      await this.communityResolverService.getCollaborationLicenseFromWhiteboardOrFail(
        whiteboardId
      );

    return this.licenseService.isEntitlementEnabled(
      license,
      LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER
    );
  }

  public async getProfile(
    whiteboardId: string,
    relations?: FindOptionsRelations<IWhiteboard>
  ): Promise<IProfile> {
    const whiteboardLoaded = await this.getWhiteboardOrFail(whiteboardId, {
      relations: {
        profile: true,
        ...relations,
      },
    });

    if (!whiteboardLoaded.profile)
      throw new EntityNotFoundException(
        `Whiteboard profile not initialised: ${whiteboardId}`,
        LogContext.COLLABORATION
      );

    return whiteboardLoaded.profile;
  }

  public save(whiteboard: IWhiteboard): Promise<IWhiteboard> {
    return this.whiteboardRepository.save(whiteboard);
  }
  // todo: use one optimized query with a "where not exists"
}
