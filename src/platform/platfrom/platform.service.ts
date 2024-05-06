import { COMMUNICATION_PLATFORM_SPACEID } from '@common/constants';
import { DiscussionCategoryPlatform } from '@common/enums/communication.discussion.category.platform';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { CommunicationService } from '@domain/communication/communication/communication.service';
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
import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
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

@Injectable()
export class PlatformService {
  constructor(
    private userService: UserService,
    private agentService: AgentService,
    private communicationService: CommunicationService,
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

    if (!platform)
      throw new EntityNotFoundException(
        'No Platform found!',
        LogContext.PLATFORM
      );
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

  async getCommunicationOrFail(): Promise<ICommunication> {
    const platform = await this.getPlatformOrFail({
      relations: { communication: true },
    });
    const communication = platform.communication;
    if (!communication) {
      throw new EntityNotFoundException(
        'No Platform Communication found!',
        LogContext.PLATFORM
      );
    }
    return communication;
  }

  async ensureCommunicationCreated(): Promise<ICommunication> {
    const platform = await this.getPlatformOrFail({
      relations: { communication: true },
    });
    const communication = platform.communication;
    if (!communication) {
      platform.communication =
        await this.communicationService.createCommunication(
          'platform',
          COMMUNICATION_PLATFORM_SPACEID,
          Object.values(DiscussionCategoryPlatform)
        );
      await this.savePlatform(platform);
      return platform.communication;
    }
    return communication;
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
          where: { category: DiscussionCategory.RELEASES },
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
      default:
        throw new ForbiddenException(
          `Role not supported: ${role}`,
          LogContext.AUTH
        );
    }
    return result;
  }
}
