import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { IPost } from '@domain/collaboration/post/post.interface';
import { Conversation } from '@domain/communication/conversation/conversation.entity';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { Space } from '@domain/space/space/space.entity';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { CalendarEvent } from '@domain/timeline/event/event.entity';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';

@Injectable()
export class RoomResolverService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getRoleSetAndSettingsForCollaborationCalloutsSet(
    calloutsSetID: string
  ): Promise<{
    roleSet: IRoleSet;
    platformRolesAccess: IPlatformRolesAccess;
    spaceSettings: ISpaceSettings;
  }> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            id: calloutsSetID,
          },
        },
      },
      relations: {
        community: {
          roleSet: true,
        },
      },
    });
    if (
      !space ||
      !space.community ||
      !space.community.roleSet ||
      !space.settings
    ) {
      throw new EntityNotInitializedException(
        `Unable to load all entities for roleSet + settings for collaboration ${calloutsSetID}`,
        LogContext.COMMUNITY
      );
    }
    // Directly parse the settings string to avoid the need to load the settings service
    const roleSet = space.community.roleSet;
    const platformRolesAccess: IPlatformRolesAccess =
      space.platformRolesAccess || {
        roles: [],
      };
    return { roleSet, platformRolesAccess, spaceSettings: space.settings };
  }

  async getRoleSetAndPlatformRolesWithAccessForCallout(
    calloutID: string
  ): Promise<{
    roleSet?: IRoleSet;
    platformRolesAccess: IPlatformRolesAccess;
    spaceSettings?: ISpaceSettings;
  }> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            callouts: {
              id: calloutID,
            },
          },
        },
      },
      relations: {
        community: {
          roleSet: true,
        },
      },
    });

    // Directly parse the settings string to avoid the need to load the settings service
    // We have 2 types of CalloutSet parents now, and KnowledgeBase doesn't have a roleSet and spaceSettings
    const roleSet: IRoleSet | undefined = space?.community?.roleSet;
    const platformRolesAccess: IPlatformRolesAccess =
      space?.platformRolesAccess || {
        roles: [],
      };
    const spaceSettings: ISpaceSettings | undefined = space?.settings;

    return { roleSet, platformRolesAccess, spaceSettings };
  }

  async getCalloutWithPostContributionForRoom(roomID: string): Promise<{
    post: IPost;
    callout: ICallout;
    contribution: ICalloutContribution;
  }> {
    const callout = await this.entityManager.findOne(Callout, {
      where: {
        contributions: {
          post: {
            comments: { id: roomID },
          },
        },
      },
      relations: {
        contributions: {
          post: {
            profile: true,
          },
        },
      },
    });
    if (
      !callout ||
      !callout.contributions ||
      callout.contributions.length === 0 ||
      !callout.contributions[0].post
    ) {
      throw new EntityNotFoundException(
        `Unable to identify Callout with Post contribution for Room: : ${roomID}`,
        LogContext.COLLABORATION
      );
    }
    // First contribution since we are selecting all contributions, with a certain roomID.
    // Since we have Room->Post->Contribution->Callout we can safely assume Room is indirectly OneToOne related to Contribution through Post
    const postContribution = callout.contributions[0].post;
    return {
      post: postContribution,
      callout,
      contribution: callout.contributions[0],
    };
  }

  async getCalloutForRoom(commentsID: string): Promise<ICallout> {
    const result = await this.entityManager.findOne(Callout, {
      where: {
        comments: { id: commentsID },
      },
      relations: {
        calloutsSet: true,
      },
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Callout for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }

  async getCalendarEventForRoom(commentsID: string): Promise<ICalendarEvent> {
    const result = await this.entityManager.findOne(CalendarEvent, {
      where: {
        comments: { id: commentsID },
      },
      relations: { profile: true, comments: true, calendar: true },
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify CalendarEvent for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }

  async getDiscussionForRoom(commentsID: string): Promise<IDiscussion> {
    // check if this is a comment related to an calendar
    const result = await this.entityManager.findOne(Discussion, {
      where: {
        comments: { id: commentsID },
      },
      relations: { profile: true, comments: true },
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Discussion for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }

  async getConversationForRoom(roomID: string): Promise<IConversation> {
    const result = await this.entityManager.findOne(Conversation, {
      where: {
        room: { id: roomID },
      },
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Conversation for Room: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
    return result;
  }
}
