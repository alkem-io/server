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
    private licenseService: LicenseService
  ) {}

  async createMemo(
    { markdown, ...restOfMemoData }: CreateMemoInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IMemo> {
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
    await this.profileService.addVisualsOnProfile(
      memo.profile,
      restOfMemoData.profile?.visuals,
      [VisualType.CARD]
    );
    await this.profileService.addOrUpdateTagsetOnProfile(memo.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    return this.save(memo);
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
