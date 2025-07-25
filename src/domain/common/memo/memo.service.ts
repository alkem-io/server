import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Memo } from './memo.entity';
import { IMemo } from './memo.interface';
import { CreateMemoInput } from './dto/memo.dto.create';
import { UpdateMemoInput } from './dto/memo.dto.update';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicenseService } from '../license/license.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
    memoData: CreateMemoInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IMemo> {
    const memo: IMemo = Memo.create({
      ...memoData,
    });
    memo.authorization = new AuthorizationPolicy(AuthorizationPolicyType.MEMO);
    memo.createdBy = userID;
    memo.contentUpdatePolicy = ContentUpdatePolicy.CONTRIBUTORS;

    memo.profile = await this.profileService.createProfile(
      memoData.profile ?? {
        displayName: 'Memo',
      },
      ProfileType.MEMO,
      storageAggregator
    );
    await this.profileService.addVisualsOnProfile(
      memo.profile,
      memoData.profile?.visuals,
      [VisualType.CARD]
    );
    await this.profileService.addOrUpdateTagsetOnProfile(memo.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    return memo;
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

  async updateMemo(
    memoInput: IMemo,
    updateMemoData: UpdateMemoInput
  ): Promise<IMemo> {
    let memo = await this.getMemoOrFail(memoInput.id, {
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
    updatedMemoContent: string
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
        `Profile not initialized on memo: '${memo.id}'`,
        LogContext.MEMOS
      );
    }

    let newMemoContent = updatedMemoContent;
    const storageBucket = memo.profile.storageBucket;
    if (storageBucket) {
      newMemoContent =
        await this.profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket(
          updatedMemoContent,
          storageBucket
        );
    }

    memo.content = newMemoContent;
    return this.save(memo);
  }

  public async isMultiUser(memoId: string): Promise<boolean> {
    const license =
      await this.communityResolverService.getCollaborationLicenseFromMemoOrFail(
        memoId
      );

    return this.licenseService.isEntitlementEnabled(
      license,
      LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER //!! TODO: Entitlement for memos too?
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
