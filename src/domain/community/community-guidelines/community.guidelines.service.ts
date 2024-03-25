import { UUID_LENGTH } from '@common/constants';
import { LogContext, ProfileType } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunityGuidelines } from './community.guidelines.entity';
import { ICommunityGuidelines } from './community.guidelines.interface';
import { UpdateCommunityGuidelinesInput } from './dto/community.guidelines.dto.update';
import { CreateCommunityGuidelinesInput } from './dto/community.guidelines.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { TagsetType } from '@common/enums/tagset.type';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';

@Injectable()
export class CommunityGuidelinesService {
  constructor(
    private profileService: ProfileService,
    @InjectRepository(CommunityGuidelines)
    private communityGuidelinesRepository: Repository<CommunityGuidelines>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunityGuidelines(
    communityGuidelinesData: CreateCommunityGuidelinesInput,
    storageAggregator: IStorageAggregator
  ): Promise<ICommunityGuidelines> {
    const communityGuidelines: ICommunityGuidelines = new CommunityGuidelines();
    communityGuidelines.authorization = new AuthorizationPolicy();

    const defaultTagset: CreateTagsetInput = {
      name: TagsetReservedName.DEFAULT,
      type: TagsetType.FREEFORM,
      tags: [],
    };
    communityGuidelinesData.profile.tagsets =
      this.profileService.updateProfileTagsetInputs(
        communityGuidelinesData.profile.tagsets,
        [defaultTagset]
      );

    communityGuidelines.profile = await this.profileService.createProfile(
      communityGuidelinesData.profile,
      ProfileType.COMMUNITY_GUIDELINES,
      storageAggregator
    );

    await this.profileService.addVisualOnProfile(
      communityGuidelines.profile,
      VisualType.CARD
    );

    return await this.communityGuidelinesRepository.save(communityGuidelines);
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
    let communityGuidelines: ICommunityGuidelines | null = null;
    if (communityGuidelinesID.length === UUID_LENGTH) {
      communityGuidelines = await this.communityGuidelinesRepository.findOne({
        where: { id: communityGuidelinesID },
        ...options,
      });
    }

    if (!communityGuidelines)
      throw new EntityNotFoundException(
        `Unable to find CommunityGuidelines with ID: ${communityGuidelinesID}`,
        LogContext.CHALLENGES
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
