import { Inject, Injectable, LoggerService } from '@nestjs/common';
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
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { DocumentService } from '@domain/storage/document/document.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getContributorType } from './get.contributor.type';

@Injectable()
export class ContributorService {
  constructor(
    private contributorLookupService: ContributorLookupService,
    private profileService: ProfileService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private avatarCreatorService: AvatarCreatorService,
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private isValidHttpUrl(urlString: string): boolean {
    let url;

    try {
      url = new URL(urlString);
    } catch {
      return false;
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  public async addAvatarVisualToContributorProfile(
    profile: IProfile,
    profileData: CreateProfileInput,
    agentInfo?: AgentInfo,
    firstName?: string,
    lastName?: string
  ): Promise<void> {
    let avatarURL: string | undefined = undefined;
    const avatarUrlFromProfile = profileData.visuals?.find(
      visual => visual.name === VisualType.AVATAR
    )?.uri;
    const avatarUrlFromAgent = agentInfo?.avatarURL;
    if (avatarUrlFromProfile && this.isValidHttpUrl(avatarUrlFromProfile)) {
      // Avatar has been explicitly set
      avatarURL = avatarUrlFromProfile;
    } else if (avatarUrlFromAgent && this.isValidHttpUrl(avatarUrlFromAgent)) {
      // Pick up the avatar from the user request context
      avatarURL = avatarUrlFromAgent;
    } else {
      // Generate a random avatar
      let avatarFirstName = profileData.displayName;
      if (firstName) {
        avatarFirstName = firstName;
      }
      avatarURL = this.avatarCreatorService.generateRandomAvatarURL(
        avatarFirstName,
        lastName
      );
    }
    const avatarVisual = [
      {
        name: VisualType.AVATAR,
        uri: avatarURL,
      },
    ];
    await this.profileService.addVisualsOnProfile(profile, avatarVisual, [
      VisualType.AVATAR,
    ]);
  }

  public async ensureAvatarIsStoredInLocalStorageBucket(
    profileID: string,
    userID?: string
  ): Promise<IProfile> {
    const profile = await this.profileService.getProfileOrFail(profileID, {
      relations: {
        visuals: true,
        storageBucket: true,
      },
    });
    try {
      if (!profile.visuals || !profile.storageBucket) {
        throw new EntityNotInitializedException(
          `Profile could not be loaded with all entities for avatar check: ${profile.id}`,
          LogContext.COMMUNITY
        );
      }
      const avatarVisual = profile.visuals.find(
        visual => visual.name === VisualType.AVATAR
      );
      if (!avatarVisual) {
        throw new EntityNotFoundException(
          `Unable to load avatar visual on profile: ${profile.id}`,
          LogContext.COMMUNITY
        );
      }

      const uri = avatarVisual.uri;
      const avatarDocument =
        await this.storageBucketService.ensureAvatarUrlIsDocument(
          uri,
          profile.storageBucket.id,
          userID
        );
      const avatartURI =
        this.documentService.getPubliclyAccessibleURL(avatarDocument);
      avatarVisual.uri = avatartURI;
    } catch (error) {
      // This method should never stop the creation of a contributor
      this.logger.error(
        `Unable to ensure Avatar for profile ${profile.id} is stored in local storage bucket: ${error}`,
        LogContext.COMMUNITY
      );
    }
    return await this.profileService.save(profile);
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

  // A utility method to load fields that are known by the Contributor type if not already
  public async getContributorWithRelations(
    contributor: IContributor,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor> {
    const type = getContributorType(contributor);
    let contributorWithRelations: IContributor | null = null;
    switch (type) {
      case RoleSetContributorType.USER:
        contributorWithRelations = await this.entityManager.findOne(User, {
          ...options,
          where: { ...options?.where, id: contributor.id },
        });
        break;
      case RoleSetContributorType.ORGANIZATION:
        contributorWithRelations = await this.entityManager.findOne(
          Organization,
          {
            ...options,
            where: { ...options?.where, id: contributor.id },
          }
        );
        break;
      case RoleSetContributorType.VIRTUAL:
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
