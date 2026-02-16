import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IRoleSet } from '@domain/access/role-set';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IMessaging } from '@domain/communication/messaging/messaging.interface';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ITemplatesManager } from '@domain/template/templates-manager/templates.manager.interface';
import { ILibrary } from '@library/library/library.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { IForum } from '@platform/forum/forum.interface';
import { ForumService } from '@platform/forum/forum.service';
import { discussions } from '@platform/forum-discussion/discussion.schema';
import { ILicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.interface';
import { desc, eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ReleaseDiscussionOutput } from './dto/release.discussion.dto';
import { platforms } from './platform.schema';
import { IPlatform } from './platform.interface';

@Injectable()
export class PlatformService {
  constructor(
    private forumService: ForumService,
    private readonly messagingService: MessagingService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getPlatformOrFail(
    options?: { relations?: Record<string, boolean> }
  ): Promise<IPlatform | never> {
    const with_ = options?.relations
      ? Object.fromEntries(
          Object.entries(options.relations).map(([key, value]) => [key, value])
        )
      : undefined;

    const platform = await this.db.query.platforms.findFirst({
      where: undefined,
      with: with_ as any,
    });

    if (!platform) {
      throw new EntityNotFoundException(
        'No Platform found!',
        LogContext.PLATFORM
      );
    }

    // Ensure notificationEmailBlacklist is initialized
    if (platform.settings?.integration) {
      if (!platform.settings.integration.notificationEmailBlacklist) {
        platform.settings.integration.notificationEmailBlacklist = [];
      }
    }

    return platform as unknown as IPlatform;
  }

  async savePlatform(platform: IPlatform): Promise<IPlatform> {
    const [saved] = await this.db
      .insert(platforms)
      .values(platform as any)
      .onConflictDoUpdate({
        target: platforms.id,
        set: platform as any,
      })
      .returning();
    return saved as unknown as IPlatform;
  }

  async getLibraryOrFail(
    relations?: Record<string, boolean>
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
      // Forum is a direct child of Platform. Since Platform has no Matrix Space,
      // Forum becomes a root-level Matrix Space (no parent).
      platform.forum = await this.forumService.createForum(
        Object.values(ForumDiscussionCategory)
      );
      await this.savePlatform(platform);
      return platform.forum;
    }
    return forum;
  }

  async ensureMessagingCreated(): Promise<IMessaging> {
    const platform = await this.getPlatformOrFail({
      relations: { messaging: true },
    });
    const messaging = platform.messaging;
    if (!messaging) {
      platform.messaging = await this.messagingService.createMessaging();
      await this.savePlatform(platform);
      return platform.messaging;
    }
    return messaging;
  }

  /**
   * @deprecated Use ensureMessagingCreated instead
   */
  async ensureConversationsSetCreated(): Promise<IMessaging> {
    return this.ensureMessagingCreated();
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
    const latestDiscussion = await this.db.query.discussions.findFirst({
      where: eq(discussions.category, ForumDiscussionCategory.RELEASES),
      orderBy: desc(discussions.createdDate),
    });

    if (!latestDiscussion) {
      return undefined;
    }

    return { nameID: latestDiscussion.nameID, id: latestDiscussion.id };
  }
}
