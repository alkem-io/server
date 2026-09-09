import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import {
  CollaborationLifecycleService,
  CollaborationMetadata,
  CollaborationMetadataUpdate,
} from '@domain/common/collaboration-metadata';
import { SigningAttemptService } from '@domain/common/content-signing/signing.attempt.service';
import type { ILicense } from '@domain/common/license/license.interface';
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { CollaborationDocumentService } from '@services/collaboration-client/collaboration-document.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { LicenseService } from '../license/license.service';
import { ProfileService } from '../profile/profile.service';
import {
  markdownToProseMirrorNode,
  markdownToYjsV2State,
  replaceMemoDocContent,
  yjsStateToMarkdown,
} from './conversion';
import { CreateMemoInput } from './dto/memo.dto.create';
import { UpdateMemoInput } from './dto/memo.dto.update';
import { Memo } from './memo.entity';
import { IMemo } from './memo.interface';

@Injectable()
export class MemoService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(Memo)
    private memoRepository: Repository<Memo>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private profileDocumentsService: ProfileDocumentsService,
    private communityResolverService: CommunityResolverService,
    private licenseService: LicenseService,
    private collaborationLifecycleService: CollaborationLifecycleService,
    private fileServiceAdapter: FileServiceAdapter,
    private collaborationDocumentService: CollaborationDocumentService,
    private signingAttemptService: SigningAttemptService
  ) {}

  async createMemo(
    { markdown, ...restOfMemoData }: CreateMemoInput,
    storageAggregator: IStorageAggregator,
    userID?: string,
    visualTypes: VisualType[] = [VisualType.CARD]
  ): Promise<IMemo> {
    // Phase 1: build entity tree in memory (no file-service-go calls). Content is
    // NO LONGER stored inline — the initial Yjs-V2 snapshot is written to the
    // memo's own bucket below (R2/FR-005), once its storageBucket id is persisted.
    const memo: IMemo = Memo.create({
      ...restOfMemoData,
    });
    memo.authorization = new AuthorizationPolicy(AuthorizationPolicyType.MEMO);
    memo.createdBy = userID;
    memo.contentUpdatePolicy = ContentUpdatePolicy.CONTRIBUTORS;

    memo.profile = await this.profileService.createProfile(
      restOfMemoData.profile ?? {
        displayName: 'Memo',
      },
      ProfileType.MEMO,
      storageAggregator
    );
    await this.profileService.addOrUpdateTagsetOnProfile(memo.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    // Phase 2: persist + materialize via the shared helper.
    // `visualTypes` is parameterised so callout-framing can request the
    // [CARD, BANNER] union (otherwise the framing context would lose
    // BANNER without re-running materialize).
    const saved = await this.save(memo);
    saved.profile =
      await this.profileService.materializeProfileContentAndVisualsOrRollback(
        saved.profile,
        restOfMemoData.profile?.visuals,
        visualTypes,
        () => this.deleteMemo(saved.id)
      );

    // Phase 3: write the creation content as a Yjs-V2 snapshot into the memo's
    // OWN storage bucket and record the pointer (R2/R4 — first-open seed +
    // quota-correct storage). The bucket id is persisted only after Phase 2.
    // Release A (staged rollout): EVERY create seeds a real snapshot — empty
    // creation content is encoded as the canonical empty Y.Doc
    // (`markdownToYjsV2State('')`). The existing create sequence may have a short
    // internal NULL-pointer interval, but it publishes the pointer before returning
    // the document to its caller. Cleanup fails closed on any
    // NULL/blank pointer under its write fence but leaves the column NULLABLE for
    // the transient new-row window. The room materializes empty + editable
    // (FR-010) either way.
    const storageBucket = saved.profile?.storageBucket;
    if (!storageBucket) {
      await this.deleteMemo(saved.id).catch(rollbackError => {
        const stack =
          rollbackError instanceof Error ? (rollbackError.stack ?? '') : '';
        this.logger.error?.(
          {
            message: 'Rollback after uninitialized memo storage bucket failed',
            memoId: saved.id,
            rollbackError: String(rollbackError),
          },
          stack,
          LogContext.MEMOS
        );
      });
      throw new EntityNotInitializedException(
        'Memo storage bucket not initialized when materializing Markdown media',
        LogContext.MEMOS,
        { memoId: saved.id }
      );
    }
    let ownedMarkdown = markdown ?? '';
    try {
      ownedMarkdown =
        await this.profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket(
          ownedMarkdown,
          storageBucket
        );
    } catch (error) {
      await this.deleteMemo(saved.id).catch(rollbackError => {
        const stack =
          rollbackError instanceof Error ? (rollbackError.stack ?? '') : '';
        this.logger.error?.(
          {
            message: 'Rollback after memo Markdown media re-home failed',
            memoId: saved.id,
            rollbackError: String(rollbackError),
          },
          stack,
          LogContext.MEMOS
        );
      });
      throw error;
    }
    const binaryUpdateV2 = markdownToYjsV2State(ownedMarkdown);
    await this.writeInitialSnapshot(saved, Buffer.from(binaryUpdateV2));
    return saved;
  }

  /**
   * Writes the creation-time Yjs-V2 snapshot into the document's own storage
   * bucket (NULL per-file authz, mirroring the collaboration-service BlobStore)
   * and records `contentPointer` / `contentVersion` on the entity
   * (R2/R4, FR-005). Shared by memo + whiteboard create. On a snapshot-write
   * failure the whole create is rolled back so a half-created document is never
   * returned.
   */
  private async writeInitialSnapshot(
    memo: IMemo,
    snapshot: Buffer
  ): Promise<void> {
    const storageBucketId = memo.profile?.storageBucket?.id;
    if (!storageBucketId) {
      throw new EntityNotInitializedException(
        'Memo storage bucket not initialized when writing initial snapshot',
        LogContext.MEMOS,
        { memoId: memo.id }
      );
    }
    try {
      const result = await this.fileServiceAdapter.createSnapshotInBucket(
        snapshot,
        storageBucketId
      );
      memo.contentPointer = result.id;
      // The room owns the version once it persists; seed at 0 so the first
      // collaboration-save's room-owned version is adopted verbatim.
      memo.contentVersion = 0;
      await this.save(memo);
    } catch (error) {
      await this.deleteMemo(memo.id).catch(rollbackError => {
        const stack =
          rollbackError instanceof Error ? (rollbackError.stack ?? '') : '';
        this.logger.error?.(
          {
            message: 'Rollback after memo snapshot write failure also failed',
            memoId: memo.id,
            rollbackError: String(rollbackError),
          },
          stack,
          LogContext.MEMOS
        );
      });
      throw error;
    }
  }

  async getMemoOrFail(
    memoID: string,
    options?: FindOneOptions<Memo>
  ): Promise<IMemo | never> {
    const memo = await this.memoRepository.findOne({
      where: { id: memoID },
      ...options,
    });

    if (!memo)
      throw new EntityNotFoundException(
        `Not able to locate Memo with the specified ID: ${memoID}`,
        LogContext.MEMOS
      );
    return memo;
  }

  async deleteMemo(memoID: string): Promise<IMemo> {
    const memo = await this.getMemoOrFail(memoID, {
      relations: {
        authorization: true,
        profile: true,
      },
    });

    if (!memo.profile) {
      throw new RelationshipNotFoundException(
        `Profile not found on memo: '${memo.id}'`,
        LogContext.MEMOS
      );
    }

    if (!memo.authorization) {
      throw new RelationshipNotFoundException(
        `Authorization not found on memo: '${memo.id}'`,
        LogContext.MEMOS
      );
    }

    // Publish-confirm BEFORE changing any owner state. The collaboration service
    // tombstones this id briefly and evicts a live room; if RabbitMQ is unavailable,
    // deletion fails cleanly before the profile, bucket/blob, authorization, or leaf
    // is touched. A crash after the confirm can temporarily tombstone a document
    // that remains in the DB, but the tombstone expires and a retry is idempotent.
    await this.collaborationLifecycleService.publishDocumentDeleted(memoID);

    await this.signingAttemptService.deleteForMemo(memoID);
    await this.profileService.deleteProfile(memo.profile.id);
    await this.authorizationPolicyService.delete(memo.authorization);
    const deletedMemo = await this.memoRepository.remove(memo as Memo);
    deletedMemo.id = memoID;

    return deletedMemo;
  }

  /**
   * Converts binary Y.Doc state update v2 to markdown string
   * @param content
   */
  public binaryToMarkdown(content: Buffer) {
    return yjsStateToMarkdown(content);
  }

  /**
   * Converts markdown string to binary Y.Doc state update v2
   * @param markdown
   */
  public markdownToStateUpdate(markdown?: string) {
    return markdown ? markdownToYjsV2State(markdown) : null;
  }

  /**
   * Reads the unified collaboration metadata/index for a memo (FR-005). The
   * blob never leaves the server on this path — only the index + the entity's
   * own `authorizationPolicyId` (= `authorizationId`, the eager
   * `authorization` relation's id) are returned.
   * @throws {EntityNotFoundException} when the memo does not exist.
   */
  async getCollaborationMetadata(
    memoId: string
  ): Promise<CollaborationMetadata> {
    const memo = (await this.getMemoOrFail(memoId, {
      loadEagerRelations: false,
      relations: {
        authorization: true,
        profile: { storageBucket: true },
      },
      select: {
        id: true,
        contentVersion: true,
        contentPointer: true,
        migrated: true,
        authorization: { id: true },
        profile: { id: true, storageBucket: { id: true } },
      },
    })) as Memo;

    return {
      // Return the persisted contract version (`contentVersion`), NOT the
      // TypeORM `@VersionColumn`, so a reloaded room sees the version it owns.
      version: memo.contentVersion ?? 0,
      // Coerce a DB NULL (a freshly-created row before its initial snapshot
      // pointer is attached) to `undefined` so the contract reply shape stays
      // `string | undefined`. The pointer column is legitimately nullable for
      // this transient window; cleanup requires zero NULL/blank pointers, but
      // does not make the column NOT NULL.
      contentPointer: memo.contentPointer ?? undefined,
      migrated: memo.migrated,
      authorizationPolicyId: memo.authorization?.id,
      // The memo's OWN storage bucket (via its profile) — the collab service
      // persists this doc's snapshot into this bucket, not a flat platform one.
      storageBucketId: memo.profile?.storageBucket?.id,
    };
  }

  /**
   * Upserts the unified collaboration metadata/index for a memo (FR-003): the
   * contract `version` + `contentPointer`. The room owns the
   * version (`contracts/persistence-ports.md`), so the value it sends is
   * PERSISTED verbatim into `contentVersion` and round-tripped back on fetch —
   * the server does NOT substitute its own counter. The inherited TypeORM
   * `@VersionColumn` (`version`) keeps its independent optimistic-locking role
   * and is left untouched here. The inline blob (`content`) is NOT touched
   * either — it never crosses the unified bus.
   * @throws {EntityNotFoundException} when the memo does not exist.
   */
  async saveCollaborationMetadata(
    memoId: string,
    update: CollaborationMetadataUpdate
  ): Promise<CollaborationMetadata> {
    // Ensure the memo exists (structured not-found upstream) before the
    // index-only write.
    await this.getMemoOrFail(memoId, {
      loadEagerRelations: false,
      select: { id: true },
    });

    // Index-only write: persist the room-owned contract version verbatim into
    // `contentVersion` (NOT the `@VersionColumn`). The inline blob is never
    // touched here — it does not cross the unified bus.
    //
    // `contentPointer` is produced solely by the checkpoint store's metapointer
    // `Record` (on establishment/recreation); PreRegister and Room.persist omit it.
    // A blank/omitted pointer on a save means UNCHANGED — set it only when a real
    // pointer is present; otherwise preserve the stored one. Overwriting it with
    // blank would orphan the content (incl. on a redelivered partial save).
    const set: { contentVersion: number; contentPointer?: string } = {
      contentVersion: update.version,
    };
    if (update.contentPointer) {
      set.contentPointer = update.contentPointer;
    }
    await this.memoRepository
      .createQueryBuilder()
      .update(Memo)
      .set(set)
      .where('id = :id', { id: memoId })
      .execute();

    // Project the persisted index back into the contract shape rather than
    // returning a partial `IMemo` (only a subset of columns is selected).
    const memo = (await this.getMemoOrFail(memoId, {
      loadEagerRelations: false,
      relations: { authorization: true },
      select: {
        id: true,
        contentVersion: true,
        contentPointer: true,
        migrated: true,
        authorization: { id: true },
      },
    })) as Memo;

    return {
      version: memo.contentVersion ?? 0,
      contentPointer: memo.contentPointer ?? undefined,
      migrated: memo.migrated,
      authorizationPolicyId: memo.authorization?.id,
    };
  }

  async updateMemo(
    memoId: string,
    updateMemoData: UpdateMemoInput
  ): Promise<IMemo> {
    let memo = await this.getMemoOrFail(memoId, {
      relations: {
        profile: true,
      },
    });

    if (updateMemoData.profile) {
      memo.profile = await this.profileService.updateProfile(
        memo.profile,
        updateMemoData.profile
      );
    }

    if (updateMemoData.contentUpdatePolicy) {
      memo.contentUpdatePolicy = updateMemoData.contentUpdatePolicy;
    }
    memo = await this.save(memo);

    return memo;
  }

  /**
   * Replace an EXISTING memo's content through its live collaboration room — the single
   * authority over the document snapshot — instead of a direct snapshot/`contentPointer`
   * write (which would be clobbered by the room's next SAVE: silent data loss). The server
   * joins the room as the initiating authorized actor (like the MCP tools), re-homes
   * markdown media into the memo's own bucket for locator safety, then applies a whole-doc
   * ProseMirror replacement to the live `default` Y.XmlFragment as one durable update. The
   * room fans the change out to connected editors and its own SAVE persists the new
   * snapshot + bumps the version (006-collab-content-unification write-path fix). A cold
   * memo materializes from its durable snapshot on join. Content CREATION seeds storage
   * directly (pre-room); only existing-document edits route here.
   */
  async replaceMemoContent(
    memoId: string,
    actorId: string,
    newContent: string
  ): Promise<IMemo> {
    if (!actorId) {
      // Fail closed: a live-room edit joins as the initiating actor and must be
      // authorized — never join the collaboration room unauthenticated.
      throw new EntityNotInitializedException(
        'Cannot replace memo content without an initiating actor',
        LogContext.MEMOS,
        { memoId }
      );
    }
    const memo = await this.getMemoOrFail(memoId, {
      loadEagerRelations: false,
      relations: { profile: { storageBucket: true } },
      select: {
        id: true,
        profile: { id: true, storageBucket: { id: true } },
      },
    });
    if (!memo?.profile) {
      throw new EntityNotInitializedException(
        'Profile not initialized on Memo',
        LogContext.MEMOS,
        { memoId }
      );
    }
    if (!newContent) {
      return memo;
    }

    let newMemoContent = newContent;
    const storageBucket = memo.profile.storageBucket;
    if (storageBucket) {
      newMemoContent =
        await this.profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket(
          newContent,
          storageBucket
        );
    }

    const desiredNode = markdownToProseMirrorNode(newMemoContent);
    await this.collaborationDocumentService.mutate(
      memoId,
      'memo',
      actorId,
      doc => replaceMemoDocContent(doc, desiredNode)
    );
    return memo;
  }

  public async isMultiUser(memoId: string): Promise<boolean> {
    await this.getMemoOrFail(memoId);

    let license: ILicense;
    try {
      license =
        await this.communityResolverService.getCollaborationLicenseFromMemoOrFail(
          memoId
        );
    } catch (error) {
      // Standalone memos (templates and pre-bind drafts) deliberately have no
      // parent Collaboration and therefore no inherited entitlement.
      if (error instanceof EntityNotFoundException) return false;
      throw error;
    }

    return this.licenseService.isEntitlementEnabled(
      license,
      LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER
    );
  }

  public async getProfile(
    memoId: string,
    relations?: FindOptionsRelations<IMemo>
  ): Promise<IProfile> {
    const memoLoaded = await this.getMemoOrFail(memoId, {
      relations: {
        profile: true,
        ...relations,
      },
    });

    if (!memoLoaded.profile)
      throw new EntityNotFoundException(
        `Memo profile not initialised: ${memoId}`,
        LogContext.MEMOS
      );

    return memoLoaded.profile;
  }

  public save(memo: IMemo): Promise<IMemo> {
    return this.memoRepository.save(memo);
  }
}
