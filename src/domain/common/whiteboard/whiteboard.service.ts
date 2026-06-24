import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ExcalidrawContent } from '@common/interfaces';
import {
  CollaborationLifecycleService,
  CollaborationMetadata,
  CollaborationMetadataUpdate,
} from '@domain/common/collaboration-metadata';
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import * as Y from 'yjs';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { LicenseService } from '../license/license.service';
import { ProfileService } from '../profile/profile.service';
import { CreateWhiteboardInput } from './dto/whiteboard.dto.create';
import { UpdateWhiteboardInput } from './dto/whiteboard.dto.update';
import { Whiteboard } from './whiteboard.entity';
import { IWhiteboard } from './whiteboard.interface';

@Injectable()
export class WhiteboardService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private profileDocumentsService: ProfileDocumentsService,
    private communityResolverService: CommunityResolverService,
    private licenseService: LicenseService,
    private collaborationLifecycleService: CollaborationLifecycleService,
    private fileServiceAdapter: FileServiceAdapter
  ) {}

  async createWhiteboard(
    whiteboardData: CreateWhiteboardInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IWhiteboard> {
    // The initial content arrives server-side as a base64 Yjs-V2 snapshot (the
    // single CRDT representation — never an Excalidraw scene/JSON) on client
    // create, from-template, and duplicate. It is NO LONGER stored inline — it is
    // written to the whiteboard's own bucket below (R1/R2/FR-005). Hold it aside;
    // `Whiteboard.create` no longer carries it, nor the source-copy pointer.
    const { content, sourceWhiteboardID, ...entityData } = whiteboardData;

    // #29 server-side copy: when the create references a source whiteboard, read
    // its stored snapshot and seed the new whiteboard with it. The client can no
    // longer read a live whiteboard's content (it is WS-only since 006), so the
    // "Save as Template" flow relies on this. A resolved, non-empty source wins
    // over `content` (the client sends an empty placeholder there); an
    // unresolvable / never-edited source (returns `''`) falls back to `content`.
    let initialScene = content;
    if (sourceWhiteboardID) {
      const sourceContent = await this.getWhiteboardContent(sourceWhiteboardID);
      if (sourceContent) {
        initialScene = sourceContent;
      }
    }

    // Phase 1: build entity tree in memory (no file-service-go calls).
    const whiteboard: IWhiteboard = Whiteboard.create({
      ...entityData,
    });
    whiteboard.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.WHITEBOARD
    );
    whiteboard.createdBy = userID;
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
    // Y.Map, not a reconstructed scene. Empty creation content leaves the pointer
    // unset: the room materializes empty + editable (FR-010).
    if (initialScene) {
      try {
        const storageBucketId = saved.profile.storageBucket?.id;
        if (!storageBucketId) {
          throw new EntityNotInitializedException(
            'Whiteboard storage bucket not initialized when writing initial snapshot',
            LogContext.WHITEBOARDS,
            { whiteboardId: saved.id }
          );
        }
        const snapshot = await this.rehomeSnapshotMedia(
          Buffer.from(initialScene, 'base64'),
          saved.profile.id
        );
        const result = await this.fileServiceAdapter.createSnapshotInBucket(
          snapshot,
          storageBucketId
        );
        saved.contentPointer = result.id;
        saved.blobStore = BlobStoreKind.FILE_SERVICE;
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
    }
    return saved;
  }

  /**
   * Re-home a Yjs-V2 whiteboard snapshot's embedded media into `profileId`'s
   * bucket, operating on the snapshot's own `files` Y.Map — there is no Excalidraw
   * scene anywhere on this path (the CRDT bytes are the single representation).
   * Media already in the bucket is untouched; cloned/templated media (referencing
   * another bucket) is re-uploaded and its `files` entry rewritten in place, then
   * the snapshot is re-encoded. A snapshot with no media is returned verbatim.
   */
  private async rehomeSnapshotMedia(
    snapshot: Uint8Array,
    profileId: string
  ): Promise<Buffer> {
    const doc = new Y.Doc();
    try {
      Y.applyUpdateV2(doc, snapshot);
      const filesMap = doc.getMap<unknown>('files');
      if (filesMap.size === 0) {
        return Buffer.from(snapshot);
      }
      const files: Record<string, unknown> = {};
      filesMap.forEach((value, key) => {
        files[key] = value;
      });
      const rehomed = await this.reuploadDocumentsIfNotInBucket(
        { elements: [], files } as unknown as ExcalidrawContent,
        profileId
      );
      doc.transact(() => {
        for (const [key, value] of Object.entries(rehomed.files ?? {})) {
          filesMap.set(key, value);
        }
      });
      return Buffer.from(Y.encodeStateAsUpdateV2(doc));
    } finally {
      doc.destroy();
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

    const deletedWhiteboard = await this.whiteboardRepository.remove(
      whiteboard as Whiteboard
    );
    deletedWhiteboard.id = whiteboardID;

    // Owner-driven lifecycle (FR-006/FR-023): the whiteboard is the leaf every
    // cascade path (callout framing / contribution / direct) passes through, so
    // emitting here fires exactly once on a successful delete. Fire-and-forget;
    // no event on a thrown delete above. `document.deleted` is idempotent
    // downstream.
    this.collaborationLifecycleService.emitDocumentDeleted(whiteboardID);

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
   * the bucket (R1/R2/FR-005) — the inline `content` column is gone. The content
   * originates server-side here, so it is persisted directly; the next open seeds
   * from this snapshot. The superseded snapshot file is deleted (latest-only).
   */
  async updateWhiteboardContent(
    whiteboardInputId: string,
    updateWhiteboardContent: string
  ): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInputId, {
      loadEagerRelations: false,
      relations: {
        profile: { storageBucket: true },
      },
      select: {
        id: true,
        contentPointer: true,
        blobStore: true,
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
    // representation — no Excalidraw scene/JSON). Re-home embedded media via the
    // snapshot's own `files` Y.Map, then replace the stored snapshot verbatim.
    const snapshot = await this.rehomeSnapshotMedia(
      Buffer.from(updateWhiteboardContent, 'base64'),
      whiteboard.profile.id
    );
    const previousPointer = whiteboard.contentPointer;
    const result = await this.fileServiceAdapter.createSnapshotInBucket(
      snapshot,
      whiteboard.profile.storageBucket.id
    );
    whiteboard.contentPointer = result.id;
    whiteboard.blobStore = BlobStoreKind.FILE_SERVICE;
    const saved = await this.save(whiteboard);

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
  }

  /**
   * Reads a whiteboard's stored content as a base64-encoded Yjs-V2 snapshot — the
   * single CRDT representation, kept opaque (no Excalidraw scene/JSON, no
   * decode/re-encode). The snapshot lives in the whiteboard's own file-service
   * bucket and is located by `contentPointer`; this re-reads it the same way the
   * memo-content loader / input-creator builders do (file-service
   * `content-batch`), NOT the inline column (gone — 006-collab-content-unification).
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
        blobStore: true,
        authorization: { id: true },
        profile: { id: true, storageBucket: { id: true } },
      },
    })) as Whiteboard;

    return {
      // Return the persisted contract version (`contentVersion`), NOT the
      // TypeORM `@VersionColumn`, so a reloaded room sees the version it owns.
      version: whiteboard.contentVersion ?? 0,
      // Coerce DB NULLs (e.g. after `deleteCollaborationMetadata`) to
      // `undefined` so the contract reply shape stays `string | undefined`.
      contentPointer: whiteboard.contentPointer ?? undefined,
      blobStore: whiteboard.blobStore ?? undefined,
      authorizationPolicyId: whiteboard.authorization?.id,
      // The whiteboard's OWN storage bucket (via its profile) — the collab
      // service persists this doc's snapshot into this bucket, not a flat one.
      storageBucketId: whiteboard.profile?.storageBucket?.id,
    };
  }

  /**
   * Upserts the unified collaboration metadata/index for a whiteboard
   * (FR-003): the contract `version` + `contentPointer` + `blobStore`. The room
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
    await this.whiteboardRepository
      .createQueryBuilder()
      .update(Whiteboard)
      .set({
        contentVersion: update.version,
        contentPointer: update.contentPointer,
        blobStore: update.blobStore,
      })
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
        blobStore: true,
        authorization: { id: true },
      },
    })) as Whiteboard;

    return {
      version: whiteboard.contentVersion ?? 0,
      contentPointer: whiteboard.contentPointer ?? undefined,
      blobStore: whiteboard.blobStore ?? undefined,
      authorizationPolicyId: whiteboard.authorization?.id,
    };
  }

  /**
   * Idempotently purges the unified collaboration metadata/index for a
   * whiteboard (the collab-side `MetadataStore.Delete` port). v1 stores the
   * index as columns on the entity, so this clears the pointer + store if the
   * row still exists; an absent row is a no-op (idempotent — FR-006 /
   * contract). It does NOT delete the whiteboard entity itself: entity
   * lifecycle is owner-driven (`deleteWhiteboard`), and server emits
   * `document.deleted` to the collab service.
   */
  async deleteCollaborationMetadata(whiteboardId: string): Promise<void> {
    // Clear `contentVersion` alongside the pointer + store so a post-delete
    // `getCollaborationMetadata` does not round-trip a stale non-zero version
    // (it derives `version` from `contentVersion`).
    await this.whiteboardRepository
      .createQueryBuilder()
      .update(Whiteboard)
      .set({
        contentVersion: null as any,
        contentPointer: null as any,
        blobStore: null as any,
      })
      .where('id = :id', { id: whiteboardId })
      .execute();
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
  // to return just the ones not in the bucket
  // https://github.com/alkem-io/server/issues/4559
  /**
   * Re-uploads documents if not in the bucket.
   * @throws {EntityNotInitializedException} if profile or storage bucket is not found.
   */
  private async reuploadDocumentsIfNotInBucket(
    whiteboardContent: ExcalidrawContent,
    profileIdToCheck: string
  ): Promise<ExcalidrawContent> {
    if (!whiteboardContent.files) {
      return whiteboardContent;
    }

    const files = Object.entries(whiteboardContent.files);

    if (!files.length) {
      return whiteboardContent;
    }

    const profile = await this.profileService.getProfileOrFail(
      profileIdToCheck,
      {
        relations: {
          storageBucket: {
            documents: true,
          },
        },
      }
    );
    if (!profile.storageBucket) {
      throw new EntityNotInitializedException(
        'Profile: no definition of StorageBucket',
        LogContext.PROFILE
      );
    }

    for (const [, file] of files) {
      if (!file.url) {
        continue;
      }
      let newDocUrl: string | undefined;
      try {
        newDocUrl =
          await this.profileDocumentsService.reuploadFileOnStorageBucket(
            file.url,
            profile.storageBucket,
            true
          );
      } catch (e: any) {
        if (e instanceof EntityNotFoundException) {
          this.logger.warn?.(
            `Tried to re-upload file (${file.url}) but file was not found: ${e?.message}`,
            LogContext.WHITEBOARDS
          );
        } else {
          this.logger.warn?.(
            `Tried to re-upload file (${file.url}) but an error occurred: ${e?.message}`,
            LogContext.WHITEBOARDS
          );
        }

        newDocUrl = undefined;
      }

      if (!newDocUrl || newDocUrl === file.url) {
        continue;
      }

      // change the url to the new document
      whiteboardContent.files[file.id] = {
        ...file,
        url: newDocUrl,
      };
    }

    return whiteboardContent;
  }
}
