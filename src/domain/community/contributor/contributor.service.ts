import { LogContext } from '@common/enums/logging.context';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq } from 'drizzle-orm';
import { users } from '../user/user.schema';
import { organizations } from '../organization/organization.schema';
import { virtualContributors } from '../virtual-contributor/virtual.contributor.schema';
import { IContributor } from './contributor.interface';
import { getContributorType } from './get.contributor.type';

type ContributorFindOptions = {
  with?: {
    agent?: boolean;
    profile?: boolean;
    authorization?: boolean;
  };
};

@Injectable()
export class ContributorService {
  constructor(
    private contributorLookupService: ContributorLookupService,
    private profileService: ProfileService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
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
    let avatarURL: string | undefined;
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
    options?: ContributorFindOptions
  ): Promise<IContributor | null> {
    return await this.contributorLookupService.getContributorByUUID(
      contributorID,
      options
    );
  }

  async getContributorByUuidOrFail(
    contributorID: string,
    options?: ContributorFindOptions
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
      with: { agent: true },
    });

    if (!contributor.agent) {
      throw new EntityNotInitializedException(
        `Contributor Agent not initialized: ${contributorID}`,
        LogContext.AUTH
      );
    }
    return { contributor: contributor, agent: contributor.agent };
  }

  private buildWithClause(options?: ContributorFindOptions): Record<string, any> {
    const withClause: any = {};
    if (options?.with) {
      if (options.with.agent) withClause.agent = true;
      if (options.with.profile) withClause.profile = true;
      if (options.with.authorization) withClause.authorization = true;
    }
    return withClause;
  }

  // A utility method to load fields that are known by the Contributor type if not already
  public async getContributorWithRelations(
    contributor: IContributor,
    options?: ContributorFindOptions
  ): Promise<IContributor> {
    const type = getContributorType(contributor);
    const withClause = this.buildWithClause(options);
    let contributorWithRelations: any = null;
    switch (type) {
      case RoleSetContributorType.USER:
        contributorWithRelations = await this.db.query.users.findFirst({
          where: eq(users.id, contributor.id),
          ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
        });
        break;
      case RoleSetContributorType.ORGANIZATION:
        contributorWithRelations = await this.db.query.organizations.findFirst({
          where: eq(organizations.id, contributor.id),
          ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
        });
        break;
      case RoleSetContributorType.VIRTUAL:
        contributorWithRelations = await this.db.query.virtualContributors.findFirst({
          where: eq(virtualContributors.id, contributor.id),
          ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
        });
        break;
    }
    if (!contributorWithRelations) {
      throw new RelationshipNotFoundException(
        `Unable to determine contributor type for ${contributor.id}`,
        LogContext.COMMUNITY
      );
    }
    return contributorWithRelations as unknown as IContributor;
  }
}
