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
import { ForumService } from '@platform/forum/forum.service';
import { IForum } from '@platform/forum/forum.interface';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { ITemplatesManager } from '@domain/template/templates-manager/templates.manager.interface';
import { ILicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IRoleSet } from '@domain/access/role-set';
import { IConversationsSet } from '@domain/communication/conversations-set/conversations.set.interface';

@Injectable()
export class PlatformService {
  constructor(
    private forumService: ForumService,
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

  async getTemplatesManagerOrFail(): Promise<ITemplatesManager> {
    const platform = await this.getPlatformOrFail({
      relations: { templatesManager: true },
    });
    if (!platform || !platform.templatesManager) {
      throw new EntityNotFoundException(
        'Unable to find templatesManager for platform',
        LogContext.PLATFORM
      );
    }

    return platform.templatesManager;
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

  public async getGuidanceVirtualContributorOrFail(): Promise<IVirtualContributor> {
    const platform = await this.getPlatformOrFail({
      relations: {
        guidanceVirtualContributor: true,
      },
    });
    const guidanceVC = platform.guidanceVirtualContributor;
    if (!guidanceVC) {
      throw new EntityNotFoundException(
        'Unable to find Virtual Contributor for Guidance on Platform',
        LogContext.PLATFORM
      );
    }
    return guidanceVC;
  }

  async getLicensingFramework(
    platformInput: IPlatform
  ): Promise<ILicensingFramework> {
    const platform = await this.getPlatformOrFail({
      relations: {
        licensingFramework: true,
      },
    });
    const licensing = platform.licensingFramework;

    if (!licensing) {
      throw new EntityNotFoundException(
        `Unable to find Licensing for Platform: ${platformInput.id}`,
        LogContext.PLATFORM
      );
    }

    return licensing;
  }

  async getRoleSetOrFail(): Promise<IRoleSet | never> {
    const platform = await this.getPlatformOrFail({
      relations: {
        roleSet: true,
      },
    });
    const roleSet = platform.roleSet;

    if (!roleSet) {
      throw new EntityNotFoundException(
        'Unable to find RoleSet for Platform',
        LogContext.PLATFORM
      );
    }

    return roleSet;
  }

  async getConversationsSetOrFail(): Promise<IConversationsSet | never> {
    const platform = await this.getPlatformOrFail({
      relations: {
        conversationsSet: true,
      },
    });
    const conversationsSet = platform.conversationsSet;

    if (!conversationsSet) {
      throw new EntityNotFoundException(
        'Unable to find ConversationsSet for Platform',
        LogContext.PLATFORM
      );
    }

    return conversationsSet;
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
    } catch {
      return undefined;
    }

    return { nameID: latestDiscussion.nameID, id: latestDiscussion.id };
  }
}
