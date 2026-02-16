import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { knowledgeBases } from '@domain/common/knowledge-base/knowledge.base.schema';
import { IOrganization } from '@domain/community/organization';
import { organizations } from '@domain/community/organization/organization.schema';
import { IUser } from '@domain/community/user/user.interface';
import { users } from '@domain/community/user/user.schema';
import { virtualContributors } from '@domain/community/virtual-contributor/virtual.contributor.schema';
import { accounts } from '@domain/space/account/account.schema';
import { IAccount } from '@domain/space/account/account.interface';
import { spaces } from '@domain/space/space/space.schema';
import { ISpace } from '@domain/space/space/space.interface';
import { storageAggregators } from '@domain/storage/storage-aggregator/storage.aggregator.schema';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { templates } from '@domain/template/template/template.schema';
import { templateContentSpaces } from '@domain/template/template-content-space/template.content.space.schema';
import { templatesManagers } from '@domain/template/templates-manager/templates.manager.schema';
import { templatesSets } from '@domain/template/templates-set/templates.set.schema';
import { innovationPacks } from '@library/innovation-pack/innovation.pack.schema';
import {
  Inject,
  Injectable,
  LoggerService,
  NotImplementedException,
} from '@nestjs/common';
import { platforms } from '@platform/platform/platform.schema';
import { isUUID } from 'class-validator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, sql } from 'drizzle-orm';
import { TimelineResolverService } from '../entity-resolver/timeline.resolver.service';

@Injectable()
export class StorageAggregatorResolverService {
  constructor(
    private timelineResolverService: TimelineResolverService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getStorageAggregatorOrFail(
    storageAggregatorID: string
  ): Promise<IStorageAggregator | never> {
    if (!storageAggregatorID) {
      throw new EntityNotFoundException(
        `StorageAggregator not found: ${storageAggregatorID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    const storageAggregator =
      await this.db.query.storageAggregators.findFirst({
        where: eq(storageAggregators.id, storageAggregatorID),
      });
    if (!storageAggregator)
      throw new EntityNotFoundException(
        `StorageAggregator not found: ${storageAggregatorID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    return storageAggregator as unknown as IStorageAggregator;
  }

  public async getPlatformStorageAggregator(): Promise<IStorageAggregator> {
    const result = await this.db.query.platforms.findFirst({
      columns: {
        storageAggregatorId: true,
      },
    });
    if (!result?.storageAggregatorId) {
      throw new EntityNotFoundException(
        'Unable to find platform storage aggregator',
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return this.getStorageAggregatorOrFail(result.storageAggregatorId);
  }

  public async getParentAccountForStorageAggregator(
    storageAggregator: IStorageAggregator
  ): Promise<IAccount> {
    const account = await this.db.query.accounts.findFirst({
      where: eq(accounts.storageAggregatorId, storageAggregator.id),
    });
    if (!account) {
      throw new EntityNotFoundException(
        `Unable to retrieve Account for storage aggregator ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return account as unknown as IAccount;
  }

  public async getParentSpaceForStorageAggregator(
    storageAggregator: IStorageAggregator
  ): Promise<ISpace> {
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.storageAggregatorId, storageAggregator.id),
      with: {
        about: {
          with: {
            profile: true,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to retrieve Space for storage aggregator ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space as unknown as ISpace;
  }

  public async getParentOrganizationForStorageAggregator(
    storageAggregator: IStorageAggregator
  ): Promise<IOrganization> {
    const organization = await this.db.query.organizations.findFirst({
      where: eq(organizations.storageAggregatorId, storageAggregator.id),
      with: {
        profile: true,
      },
    });
    if (!organization) {
      throw new EntityNotFoundException(
        `Unable to retrieve Organization for storage aggregator ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return organization as unknown as IOrganization;
  }

  public async getParentUserForStorageAggregator(
    storageAggregator: IStorageAggregator
  ): Promise<IUser> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.storageAggregatorId, storageAggregator.id),
      with: {
        profile: true,
      },
    });
    if (!user) {
      throw new EntityNotFoundException(
        `Unable to retrieve User for storage aggregator ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return user as unknown as IUser;
  }

  public async getStorageAggregatorForTemplatesManager(
    templatesManagerId: string
  ): Promise<IStorageAggregator> {
    if (!isUUID(templatesManagerId)) {
      throw new InvalidUUID(
        'Invalid UUID provided to find the StorageAggregator of a templatesManager',
        LogContext.COMMUNITY,
        { provided: templatesManagerId }
      );
    }

    // First try on Space
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.templatesManagerId, templatesManagerId),
      with: {
        storageAggregator: true,
      },
    });
    if (space && space.storageAggregator) {
      return this.getStorageAggregatorOrFail(space.storageAggregator.id);
    }

    // Then try on Platform
    const platform = await this.db.query.platforms.findFirst({
      where: eq(platforms.templatesManagerId, templatesManagerId),
    });
    if (platform && platform.storageAggregatorId) {
      return this.getStorageAggregatorOrFail(platform.storageAggregatorId);
    }
    throw new NotImplementedException(
      `Unable to retrieve storage aggregator to use for TemplatesManager ${templatesManagerId}`,
      LogContext.STORAGE_AGGREGATOR
    );
  }

  public async getStorageAggregatorForTemplatesSet(
    templatesSetId: string
  ): Promise<IStorageAggregator> {
    if (!isUUID(templatesSetId)) {
      throw new InvalidUUID(
        'Invalid UUID provided to find the StorageAggregator of a templateSet',
        LogContext.STORAGE_AGGREGATOR,
        { provided: templatesSetId }
      );
    }

    // First try via TemplatesManager
    const templatesManager = await this.db.query.templatesManagers.findFirst({
      where: eq(templatesManagers.templatesSetId, templatesSetId),
    });
    if (templatesManager) {
      return this.getStorageAggregatorForTemplatesManager(templatesManager.id);
    }

    // Then on InnovationPack
    const innovationPack = await this.db.query.innovationPacks.findFirst({
      where: eq(innovationPacks.templatesSetId, templatesSetId),
    });
    if (innovationPack && innovationPack.accountId) {
      const account = await this.db.query.accounts.findFirst({
        where: eq(accounts.id, innovationPack.accountId),
        with: {
          storageAggregator: true,
        },
      });
      if (account && account.storageAggregator) {
        return this.getStorageAggregatorOrFail(account.storageAggregator.id);
      }
    }

    throw new EntityNotFoundException(
      `Unable to retrieve storage aggregator to use for TemplatesSet ${templatesSetId}`,
      LogContext.STORAGE_AGGREGATOR
    );
  }

  public async getStorageAggregatorForCalloutsSet(
    calloutsSetID: string
  ): Promise<IStorageAggregator> {
    if (!isUUID(calloutsSetID)) {
      throw new InvalidUUID(
        'Invalid UUID provided to find the StorageAggregator of a calloutsSet',
        LogContext.STORAGE_AGGREGATOR,
        { provided: calloutsSetID }
      );
    }

    // First try on Space via collaboration
    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, calloutsSetID),
    });
    if (collaboration) {
      const space = await this.db.query.spaces.findFirst({
        where: eq(spaces.collaborationId, collaboration.id),
        with: {
          storageAggregator: true,
        },
      });
      if (space && space.storageAggregator) {
        return this.getStorageAggregatorOrFail(space.storageAggregator.id);
      }
    }

    // Then try on VirtualContributor via knowledgeBase
    const knowledgeBase = await this.db.query.knowledgeBases.findFirst({
      where: eq(knowledgeBases.calloutsSetId, calloutsSetID),
    });
    if (knowledgeBase) {
      const vc = await this.db.query.virtualContributors.findFirst({
        where: eq(virtualContributors.knowledgeBaseId, knowledgeBase.id),
        with: {
          account: {
            with: {
              storageAggregator: true,
            },
          },
        },
      });
      if (vc && vc.account && vc.account.storageAggregator) {
        return this.getStorageAggregatorOrFail(vc.account.storageAggregator.id);
      }
    }

    throw new EntityNotFoundException(
      `Unable to retrieve storage aggregator to use for CalloutsSet ${calloutsSetID}`,
      LogContext.STORAGE_AGGREGATOR
    );
  }

  public async getStorageAggregatorForCollaboration(
    collaborationID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCollaboration(collaborationID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  public async getStorageAggregatorForCalendar(
    calendarID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCalendar(calendarID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCollaboration(
    collaborationID: string
  ): Promise<string> {
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaborationID),
      with: {
        storageAggregator: true,
      },
    });
    if (space) {
      if (!space.storageAggregator) {
        throw new EntityNotFoundException(
          `Unable to retrieve storage aggregator for space through collaborationID: ${collaborationID}`,
          LogContext.STORAGE_AGGREGATOR
        );
      }
      return space.storageAggregator.id;
    }
    // If not found on Space, try with Collaboration templates
    // Find templateContentSpace by collaborationId, then find template by contentSpaceId
    const templateContentSpace = await this.db.query.templateContentSpaces.findFirst({
      where: eq(templateContentSpaces.collaborationId, collaborationID),
    });
    if (templateContentSpace) {
      const template = await this.db.query.templates.findFirst({
        where: eq(templates.contentSpaceId, templateContentSpace.id),
        with: {
          templatesSet: true,
        },
      });
      if (template && template.templatesSet) {
        return (
          await this.getStorageAggregatorForTemplatesSet(template.templatesSet.id)
        ).id;
      }
    }
    throw new EntityNotFoundException(
      `Unable to retrieve storage aggregator for collaborationID: ${collaborationID}`,
      LogContext.STORAGE_AGGREGATOR
    );
  }

  private async getStorageAggregatorIdForCalendar(
    calendarID: string
  ): Promise<string> {
    const collaborationId =
      await this.timelineResolverService.getCollaborationIdForCalendar(
        calendarID
      );
    return await this.getStorageAggregatorIdForCollaboration(collaborationId);
  }

  public async getStorageAggregatorForForum(): Promise<IStorageAggregator> {
    return await this.getPlatformStorageAggregator();
  }

  public async getStorageAggregatorForCommunity(
    communityID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCommunity(communityID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCommunity(
    communityID: string
  ): Promise<string> {
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.communityId, communityID),
      with: {
        storageAggregator: true,
      },
    });
    if (!space || !space.storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to retrieve storage aggregator for communityID: ${communityID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space.storageAggregator.id;
  }

  public async getStorageAggregatorForCallout(
    calloutID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCallout(calloutID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCallout(
    calloutID: string
  ): Promise<string> {
    const callout = await this.db.query.callouts.findFirst({
      where: eq(callouts.id, calloutID),
      with: {
        calloutsSet: true,
      },
    });
    if (!callout) {
      throw new EntityNotFoundException(
        `Unable to find callout where id: ${calloutID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    if (!callout.calloutsSet) {
      // Not in a calloutsSet, only other option is a callout template:
      return this.getStorageAggregatorIdForCalloutTemplate(calloutID);
    }

    // Callout is in a CalloutsSet, so must be linked to a Space, TemplateContentSpace or KnowledgeBase

    // Next see if have a collaboration parent or not
    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, callout.calloutsSet.id),
    });
    if (collaboration) {
      // Either Space or TemplateContentSpace
      const space = await this.db.query.spaces.findFirst({
        where: eq(spaces.collaborationId, collaboration.id),
        with: {
          storageAggregator: true,
        },
      });
      if (space) {
        if (!space.storageAggregator) {
          throw new EntityNotFoundException(
            `Unable to retrieve StorageAggregator for Space from calloutID: ${calloutID} (found CalloutsSet ${callout.calloutsSet.id} and Collaboration ${collaboration.id}, but Space has no StorageAggregator)`,
            LogContext.STORAGE_AGGREGATOR
          );
        }
        return space.storageAggregator.id;
      } else {
        // must be a template content space
        // Find templateContentSpace by collaborationId, then find template by contentSpaceId
        const tcs = await this.db.query.templateContentSpaces.findFirst({
          where: eq(templateContentSpaces.collaborationId, collaboration.id),
        });
        if (tcs) {
          const template = await this.db.query.templates.findFirst({
            where: eq(templates.contentSpaceId, tcs.id),
          });
          if (template?.templatesSetId) {
            return (
              await this.getStorageAggregatorForTemplatesSet(template.templatesSetId)
            ).id;
          }
        }
        throw new EntityNotFoundException(
          `Unable to retrieve storage aggregator for calloutID: ${calloutID} - where did find CalloutsSet ${callout.calloutsSet.id} and Collaboration ${collaboration.id} but no Space or TemplateContentSpace linked to it`,
          LogContext.STORAGE_AGGREGATOR
        );
      }
    } else {
      // Must be knowledgeBase
      const knowledgeBase = await this.db.query.knowledgeBases.findFirst({
        where: eq(knowledgeBases.calloutsSetId, callout.calloutsSet.id),
      });
      if (!knowledgeBase) {
        throw new EntityNotFoundException(
          `Unable to resolve StorageAggregator for calloutID: ${calloutID} (found CalloutsSet ${callout.calloutsSet.id}, but no KnowledgeBase linked)`,
          LogContext.STORAGE_AGGREGATOR
        );
      }

      const vc = await this.db.query.virtualContributors.findFirst({
        where: eq(virtualContributors.knowledgeBaseId, knowledgeBase.id),
        with: {
          account: {
            with: {
              storageAggregator: true,
            },
          },
        },
      });
      if (!vc || !vc.account || !vc.account.storageAggregator) {
        throw new EntityNotFoundException(
          `Unable to resolve StorageAggregator for calloutID: ${calloutID} (found CalloutsSet ${callout.calloutsSet.id}, but no KnowledgeBase linked)`,
          LogContext.STORAGE_AGGREGATOR
        );
      }

      return vc.account.storageAggregator.id;
    }
  }

  private async getStorageAggregatorIdForCalloutTemplate(
    calloutId: string
  ): Promise<string> {
    const template = await this.db.query.templates.findFirst({
      where: eq(templates.calloutId, calloutId),
    });
    if (!template?.templatesSetId) {
      throw new EntityNotFoundException(
        `Unable to retrieve storage aggregator for calloutID: ${calloutId} `,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    // TODO: probably this file needs a refactor. I don't understand why we have some getSAIdFor... and some direct getSAFor
    return (await this.getStorageAggregatorForTemplatesSet(template.templatesSetId)).id;
  }
}
