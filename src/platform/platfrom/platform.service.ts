import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ILibrary } from '@library/library/library.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityManager,
  FindOneOptions,
  FindOptionsRelations,
  Repository,
} from 'typeorm';
import { Platform } from './platform.entity';
import { IPlatform } from './platform.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { ReleaseDiscussionOutput } from './dto/release.discussion.dto';
import { PlatformRole } from '@common/enums/platform.role';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { RemovePlatformRoleFromUserInput } from './dto/platform.dto.remove.role.user';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AssignPlatformRoleToUserInput } from './dto/platform.dto.assign.role.user';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { ForumService } from '@platform/forum/forum.service';
import { IForum } from '@platform/forum/forum.interface';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { CreatePlatformInvitationInput } from '@platform/invitation/dto/platform.invitation.dto.create';
import { IPlatformInvitation } from '@platform/invitation/platform.invitation.interface';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';

@Injectable()
export class PlatformService {
  constructor(
    private userService: UserService,
    private agentService: AgentService,
    private forumService: ForumService,
    private platformInvitationService: PlatformInvitationService,
    private entityManager: EntityManager,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getPlatformOrFail(
    options?: FindOneOptions<Platform>
  ): Promise<IPlatform | never> {
    let platform: IPlatform | null = null;
    platform = (
      await this.platformRepository.find({ take: 1, ...options })
    )?.[0];

    if (!platform) {
      throw new EntityNotFoundException(
        'No Platform found!',
        LogContext.PLATFORM
      );
    }
    return platform;
  }

  async savePlatform(platform: IPlatform): Promise<IPlatform> {
    return await this.platformRepository.save(platform);
  }

  async getLibraryOrFail(
    relations?: FindOptionsRelations<IPlatform>
  ): Promise<ILibrary> {
    const platform = await this.getPlatformOrFail({
      relations: { library: true, ...relations },
    });
    const library = platform.library;
    if (!library) {
      throw new EntityNotFoundException(
        'No Platform Library found!',
        LogContext.PLATFORM
      );
    }
    return library;
  }

  async createPlatformInvitation(
    platformInvitationData: CreatePlatformInvitationInput,
    agentInfo: AgentInfo
  ): Promise<IPlatformInvitation> {
    const platform = await this.getPlatformOrFail({
      relations: { platformInvitations: true },
    });
    if (!platform.platformInvitations) {
      throw new EntityNotFoundException(
        'No Platform Invitation found!',
        LogContext.PLATFORM
      );
    }
    const platformInvitation =
      await this.platformInvitationService.createPlatformInvitation(
        platformInvitationData
      );
    platformInvitation.platform = platform;
    platformInvitation.createdBy = agentInfo.userID;
    return await this.platformInvitationService.save(platformInvitation);
  }

  async getPlatformInvitationsForRole(): Promise<IPlatformInvitation[]> {
    const platform = await this.getPlatformOrFail({
      relations: { platformInvitations: true },
    });
    if (!platform.platformInvitations) {
      throw new EntityNotFoundException(
        'No Platform Invitation found!',
        LogContext.PLATFORM
      );
    }
    return platform.platformInvitations;
  }

  async getForumOrFail(): Promise<IForum> {
    const platform = await this.getPlatformOrFail({
      relations: { forum: true },
    });
    const forum = platform.forum;
    if (!forum) {
      throw new EntityNotFoundException(
        'No Platform Forum found!',
        LogContext.PLATFORM
      );
    }
    return forum;
  }

  async ensureForumCreated(): Promise<IForum> {
    const platform = await this.getPlatformOrFail({
      relations: { forum: true },
    });
    const forum = platform.forum;
    if (!forum) {
      platform.forum = await this.forumService.createForum(
        Object.values(ForumDiscussionCategory)
      );
      await this.savePlatform(platform);
      return platform.forum;
    }
    return forum;
  }

  async getStorageAggregator(
    platformInput: IPlatform
  ): Promise<IStorageAggregator> {
    const platform = await this.getPlatformOrFail({
      relations: {
        storageAggregator: true,
      },
    });
    const storageAggregator = platform.storageAggregator;

    if (!storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to find storage aggregator for Platform: ${platformInput.id}`,
        LogContext.PLATFORM
      );
    }

    return storageAggregator;
  }

  async getLicensing(platformInput: IPlatform): Promise<ILicensing> {
    const platform = await this.getPlatformOrFail({
      relations: {
        licensing: true,
      },
    });
    const licensing = platform.licensing;

    if (!licensing) {
      throw new EntityNotFoundException(
        `Unable to find Licensing for Platform: ${platformInput.id}`,
        LogContext.PLATFORM
      );
    }

    return licensing;
  }

  getAuthorizationPolicy(platform: IPlatform): IAuthorizationPolicy {
    const authorization = platform.authorization;

    if (!authorization) {
      throw new EntityNotFoundException(
        `Unable to find Authorization Policy for Platform: ${platform.id}`,
        LogContext.PLATFORM
      );
    }

    return authorization;
  }

  public async getLatestReleaseDiscussion(): Promise<
    ReleaseDiscussionOutput | undefined
  > {
    let latestDiscussion: Discussion | undefined;
    try {
      latestDiscussion = await this.entityManager
        .getRepository(Discussion)
        .findOneOrFail({
          where: { category: ForumDiscussionCategory.RELEASES },
          order: { createdDate: 'DESC' },
        });
    } catch (error) {
      return undefined;
    }

    return { nameID: latestDiscussion.nameID, id: latestDiscussion.id };
  }

  public async assignPlatformRoleToUser(
    assignData: AssignPlatformRoleToUserInput
  ): Promise<IUser> {
    const agent = await this.userService.getAgent(assignData.userID);

    const credential = this.getCredentialForRole(assignData.role);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      ...credential,
    });

    return await this.userService.getUserWithAgent(assignData.userID);
  }

  public async removePlatformRoleFromUser(
    removeData: RemovePlatformRoleFromUserInput
  ): Promise<IUser> {
    const agent = await this.userService.getAgent(removeData.userID);

    // Validation logic
    if (removeData.role === PlatformRole.GLOBAL_ADMIN) {
      // Check not the last global admin
      await this.removeValidationSingleGlobalAdmin();
    }

    const credential = this.getCredentialForRole(removeData.role);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      ...credential,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  private async removeValidationSingleGlobalAdmin(): Promise<boolean> {
    // Check more than one
    const globalAdmins = await this.userService.usersWithCredentials({
      type: AuthorizationCredential.GLOBAL_ADMIN,
    });
    if (globalAdmins.length < 2)
      throw new ForbiddenException(
        `Not allowed to remove ${AuthorizationCredential.GLOBAL_ADMIN}: last global-admin`,
        LogContext.AUTH
      );

    return true;
  }
  private getCredentialForRole(role: PlatformRole): ICredentialDefinition {
    const result: ICredentialDefinition = {
      type: '',
      resourceID: '',
    };
    switch (role) {
      case PlatformRole.GLOBAL_ADMIN:
        result.type = AuthorizationCredential.GLOBAL_ADMIN;
        break;
      case PlatformRole.SUPPORT:
        result.type = AuthorizationCredential.GLOBAL_SUPPORT;
        break;
      case PlatformRole.LICENSE_MANAGER:
        result.type = AuthorizationCredential.GLOBAL_LICENSE_MANAGER;
        break;
      case PlatformRole.COMMUNITY_READER:
        result.type = AuthorizationCredential.GLOBAL_COMMUNITY_READ;
        break;
      case PlatformRole.SPACES_READER:
        result.type = AuthorizationCredential.GLOBAL_SPACES_READER;
        break;
      case PlatformRole.BETA_TESTER:
        result.type = AuthorizationCredential.BETA_TESTER;
        break;
      case PlatformRole.VC_CAMPAIGN:
        result.type = AuthorizationCredential.VC_CAMPAIGN;
        break;
      default:
        throw new ForbiddenException(
          `Role not supported: ${role}`,
          LogContext.AUTH
        );
    }
    return result;
  }
}
