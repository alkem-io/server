import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { VisualType } from '@common/enums/visual.type';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { CommunityGuidelines } from './community.guidelines.entity';
import { ICommunityGuidelines } from './community.guidelines.interface';
import { CreateCommunityGuidelinesInput } from './dto/community.guidelines.dto.create';
import { UpdateCommunityGuidelinesInput } from './dto/community.guidelines.dto.update';

@Injectable()
export class CommunityGuidelinesService {
  constructor(
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    @InjectRepository(CommunityGuidelines)
    private communityGuidelinesRepository: Repository<CommunityGuidelines>
  ) {}

  async createCommunityGuidelines(
    communityGuidelinesData: CreateCommunityGuidelinesInput,
    storageAggregator: IStorageAggregator
  ): Promise<ICommunityGuidelines> {
    const communityGuidelines: ICommunityGuidelines = new CommunityGuidelines();
    communityGuidelines.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNITY_GUIDELINES
    );

    const defaultTagset: CreateTagsetInput = {
      name: TagsetReservedName.DEFAULT,
      type: TagsetType.FREEFORM,
      tags: [],
    };
    communityGuidelinesData.profile.tagsets =
      this.tagsetService.updateTagsetInputs(
        communityGuidelinesData.profile.tagsets,
        [defaultTagset]
      );

    communityGuidelines.profile = await this.profileService.createProfile(
      communityGuidelinesData.profile,
      ProfileType.COMMUNITY_GUIDELINES,
      storageAggregator
    );

    await this.profileService.addVisualsOnProfile(
      communityGuidelines.profile,
      communityGuidelinesData.profile.visuals,
      [VisualType.CARD]
    );

    return communityGuidelines;
  }

  async save(
    communityGuidelines: ICommunityGuidelines
  ): Promise<ICommunityGuidelines> {
    return await this.communityGuidelinesRepository.save(communityGuidelines);
  }

  async update(
    communityGuidelines: ICommunityGuidelines,
    communityGuidelinesData: UpdateCommunityGuidelinesInput
  ): Promise<ICommunityGuidelines> {
    communityGuidelines.profile = await this.profileService.updateProfile(
      communityGuidelines.profile,
      communityGuidelinesData.profile
    );

    return await this.communityGuidelinesRepository.save(communityGuidelines);
  }

  async eraseContent(
    communityGuidelines: ICommunityGuidelines
  ): Promise<ICommunityGuidelines> {
    communityGuidelines.profile = await this.profileService.updateProfile(
      communityGuidelines.profile,
      {
        displayName: '',
        description: '',
      }
    );

    await this.profileService.deleteAllReferencesFromProfile(
      communityGuidelines.profile.id
    );
    communityGuidelines.profile.references = [];

    return await this.communityGuidelinesRepository.save(communityGuidelines);
  }

  async deleteCommunityGuidelines(
    communityGuidelinesID: string
  ): Promise<ICommunityGuidelines> {
    const communityGuidelines = await this.getCommunityGuidelinesOrFail(
      communityGuidelinesID,
      {
        relations: { profile: true },
      }
    );

    await this.profileService.deleteProfile(communityGuidelines.profile.id);

    const result = await this.communityGuidelinesRepository.remove(
      communityGuidelines as CommunityGuidelines
    );
    result.id = communityGuidelinesID;
    return result;
  }

  async getCommunityGuidelinesOrFail(
    communityGuidelinesID: string,
    options?: FindOneOptions<CommunityGuidelines>
  ): Promise<ICommunityGuidelines | never> {
    const communityGuidelines =
      await this.communityGuidelinesRepository.findOne({
        where: { id: communityGuidelinesID },
        ...options,
      });

    if (!communityGuidelines)
      throw new EntityNotFoundException(
        `Unable to find CommunityGuidelines with ID: ${communityGuidelinesID}`,
        LogContext.SPACES
      );
    return communityGuidelines;
  }

  public async getProfile(
    communityGuidelinesInput: ICommunityGuidelines,
    relations?: FindOptionsRelations<ICommunityGuidelines>
  ): Promise<IProfile> {
    const communityGuidelines = await this.getCommunityGuidelinesOrFail(
      communityGuidelinesInput.id,
      {
        relations: { profile: true, ...relations },
      }
    );
    if (!communityGuidelines.profile)
      throw new EntityNotFoundException(
        `CommunityGuidelines profile not initialised: ${communityGuidelines.id}`,
        LogContext.COLLABORATION
      );

    return communityGuidelines.profile;
  }
}
