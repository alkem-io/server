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
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { LicenseService } from '../license/license.service';
import { ProfileService } from '../profile/profile.service';
import { markdownToYjsV2State, yjsStateToMarkdown } from './conversion';
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
    private collaborationLifecycleService: CollaborationLifecycleService
  ) {}

  async createMemo(
    { markdown, ...restOfMemoData }: CreateMemoInput,
    storageAggregator: IStorageAggregator,
    userID?: string,
    visualTypes: VisualType[] = [VisualType.CARD]
  ): Promise<IMemo> {
    // Phase 1: build entity tree in memory (no file-service-go calls).
    const binaryUpdateV2 = this.markdownToStateUpdate(markdown);
    const content = binaryUpdateV2 ? Buffer.from(binaryUpdateV2) : undefined;
    const memo: IMemo = Memo.create({
      ...restOfMemoData,
      content,
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
    return saved;
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

    await this.profileService.deleteProfile(memo.profile.id);
    await this.authorizationPolicyService.delete(memo.authorization);

    const deletedMemo = await this.memoRepository.remove(memo as Memo);
    deletedMemo.id = memoID;

    // Owner-driven lifecycle (FR-006/FR-023): the memo is the leaf every cascade
    // path (callout framing / contribution / direct) passes through, so emitting
    // here fires exactly once on a successful delete. Fire-and-forget; no event
    // on a thrown delete above. `document.deleted` is idempotent downstream.
    this.collaborationLifecycleService.emitDocumentDeleted(memoID);

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

  async saveContent(memoId: string, content: Buffer): Promise<IMemo> {
    const memo = await this.getMemoOrFail(memoId);
    memo.content = content;

    return this.save(memo);
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
      relations: { authorization: true },
      select: {
        id: true,
        contentVersion: true,
        contentPointer: true,
        blobStore: true,
        authorization: { id: true },
      },
    })) as Memo;

    return {
      // Return the persisted contract version (`contentVersion`), NOT the
      // TypeORM `@VersionColumn`, so a reloaded room sees the version it owns.
      version: memo.contentVersion ?? 0,
      contentPointer: memo.contentPointer,
      blobStore: memo.blobStore,
      authorizationPolicyId: memo.authorization?.id,
    };
  }

  /**
   * Upserts the unified collaboration metadata/index for a memo (FR-003): the
   * contract `version` + `contentPointer` + `blobStore`. The room owns the
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
  ): Promise<IMemo> {
    // Ensure the memo exists (structured not-found upstream) before the
    // index-only write.
    await this.getMemoOrFail(memoId, {
      loadEagerRelations: false,
      select: { id: true },
    });

    // Index-only write: persist the room-owned contract version verbatim into
    // `contentVersion` (NOT the `@VersionColumn`), plus the pointer + store.
    // The inline blob (`content`) is never touched here — it does not cross the
    // unified bus.
    await this.memoRepository
      .createQueryBuilder()
      .update(Memo)
      .set({
        contentVersion: update.version,
        contentPointer: update.contentPointer,
        blobStore: update.blobStore,
      })
      .where('id = :id', { id: memoId })
      .execute();

    return this.getMemoOrFail(memoId, {
      loadEagerRelations: false,
      relations: { authorization: true },
      select: {
        id: true,
        contentVersion: true,
        contentPointer: true,
        blobStore: true,
        authorization: { id: true },
      },
    });
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

  async updateMemoContent(
    memoInputId: string,
    newContent: string
  ): Promise<IMemo> {
    const memo = await this.getMemoOrFail(memoInputId, {
      loadEagerRelations: false,
      relations: {
        profile: {
          storageBucket: true,
        },
      },
    });
    if (!memo?.profile) {
      throw new EntityNotInitializedException(
        'Profile not initialized on Memo',
        LogContext.MEMOS,
        { memoId: memoInputId }
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

    const binaryUpdateV2 = this.markdownToStateUpdate(newMemoContent);

    if (!binaryUpdateV2) {
      return memo;
    }

    memo.content = Buffer.from(binaryUpdateV2);

    return this.save(memo);
  }

  /**
   * Idempotently purges the unified collaboration metadata/index for a memo
   * (the collab-side `MetadataStore.Delete` port). v1 stores the index as
   * columns on the entity, so this clears the pointer + store if the row still
   * exists; an absent row is a no-op (idempotent — FR-006 / contract). It does
   * NOT delete the memo entity itself: entity lifecycle is owner-driven
   * (`deleteMemo`), and server emits `document.deleted` to the collab service.
   */
  async deleteCollaborationMetadata(memoId: string): Promise<void> {
    await this.memoRepository
      .createQueryBuilder()
      .update(Memo)
      .set({ contentPointer: null as any, blobStore: null as any })
      .where('id = :id', { id: memoId })
      .execute();
  }

  public async isMultiUser(memoId: string): Promise<boolean> {
    const license =
      await this.communityResolverService.getCollaborationLicenseFromMemoOrFail(
        memoId
      );

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
