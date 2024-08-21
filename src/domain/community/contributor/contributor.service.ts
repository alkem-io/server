import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions } from 'typeorm';
import { IContributor } from './contributor.interface';
import { User } from '../user/user.entity';
import { Organization } from '../organization/organization.entity';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IDocument } from '@domain/storage/document';

@Injectable()
export class ContributorService {
  constructor(
    private contributorLookupService: ContributorLookupService,
    private profileService: ProfileService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private avatarCreatorService: AvatarCreatorService,
    private storageBucketService: StorageBucketService
  ) {}

  public async addAvatarVisualToContributorProfile(
    profile: IProfile,
    profileData: CreateProfileInput,
    agentInfo?: AgentInfo,
    firstName?: string,
    lastName?: string
  ): Promise<void> {
    let avatarURL = profileData?.avatarURL;
    if (!avatarURL || avatarURL === '') {
      let avatarFirstName = profileData.displayName;
      if (firstName) {
        avatarFirstName = firstName;
      }
      avatarURL = this.avatarCreatorService.generateRandomAvatarURL(
        avatarFirstName,
        lastName
      );
    } else {
      if (agentInfo) {
        await this.uploadAvatarFromExternalURL(profile, agentInfo);
      }
    }
    this.profileService.addVisualOnProfile(
      profile,
      VisualType.AVATAR,
      avatarURL
    );
  }

  private async uploadAvatarFromExternalURL(
    profile: IProfile,
    agentInfo: AgentInfo
  ): Promise<IDocument> {
    if (!profile.visuals) {
      throw new EntityNotInitializedException(
        `Visuals not initialized for profile with id: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    if (!profile.storageBucket) {
      throw new EntityNotInitializedException(
        `StorageBucket not initialized for profile with id: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    const uri = agentInfo.avatarURL ?? profile.visuals[0].uri;
    return this.storageBucketService.storeAvatarUrlAsDocument(
      uri,
      profile.storageBucket.id,
      agentInfo.userID
    );
  }

  async getContributor(
    contributorID: string,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor | null> {
    return await this.contributorLookupService.getContributorByUUID(
      contributorID,
      options
    );
  }

  async getContributorByUuidOrFail(
    contributorID: string,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor | never> {
    const contributor = await this.getContributor(contributorID, options);
    if (!contributor)
      throw new EntityNotFoundException(
        `Unable to find Contributor with ID: ${contributorID}`,
        LogContext.COMMUNITY
      );
    return contributor;
  }

  async getContributorAndAgent(
    contributorID: string
  ): Promise<{ contributor: IContributor; agent: IAgent }> {
    const contributor = await this.getContributorByUuidOrFail(contributorID, {
      relations: { agent: true },
    });

    if (!contributor.agent) {
      throw new EntityNotInitializedException(
        `Contributor Agent not initialized: ${contributorID}`,
        LogContext.AUTH
      );
    }
    return { contributor: contributor, agent: contributor.agent };
  }

  public getContributorType(contributor: IContributor) {
    return this.contributorLookupService.getContributorType(contributor);
  }

  // A utility method to load fields that are known by the Contributor type if not already
  public async getContributorWithRelations(
    contributor: IContributor,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor> {
    const type = this.getContributorType(contributor);
    let contributorWithRelations: IContributor | null = null;
    switch (type) {
      case CommunityContributorType.USER:
        contributorWithRelations = await this.entityManager.findOne(User, {
          ...options,
          where: { ...options?.where, id: contributor.id },
        });
        break;
      case CommunityContributorType.ORGANIZATION:
        contributorWithRelations = await this.entityManager.findOne(
          Organization,
          {
            ...options,
            where: { ...options?.where, id: contributor.id },
          }
        );
        break;
      case CommunityContributorType.VIRTUAL:
        contributorWithRelations = await this.entityManager.findOne(
          VirtualContributor,
          {
            ...options,
            where: { ...options?.where, id: contributor.id },
          }
        );
        break;
    }
    if (!contributorWithRelations) {
      throw new RelationshipNotFoundException(
        `Unable to determine contributor type for ${contributor.id}`,
        LogContext.COMMUNITY
      );
    }
    return contributorWithRelations;
  }
}
