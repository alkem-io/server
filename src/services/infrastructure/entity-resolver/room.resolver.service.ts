import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { IPost } from '@domain/collaboration/post/post.interface';
import { posts } from '@domain/collaboration/post/post.schema';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { conversations } from '@domain/communication/conversation/conversation.schema';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { calendarEvents } from '@domain/timeline/event/event.schema';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { discussions } from '@platform/forum-discussion/discussion.schema';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, sql } from 'drizzle-orm';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { calloutsSets } from '@domain/collaboration/callouts-set/callouts.set.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { spaces } from '@domain/space/space/space.schema';

@Injectable()
export class RoomResolverService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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
    // Find the collaboration that owns this calloutsSet, then the space
    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, calloutsSetID),
    });
    if (!collaboration) {
      throw new EntityNotInitializedException(
        `Unable to load all entities for roleSet + settings for collaboration ${calloutsSetID}`,
        LogContext.COMMUNITY
      );
    }

    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaboration.id),
      with: {
        community: {
          with: {
            roleSet: true,
          },
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
    const roleSet = space.community.roleSet as unknown as IRoleSet;
    const platformRolesAccess: IPlatformRolesAccess =
      (space.platformRolesAccess as IPlatformRolesAccess) || {
        roles: [],
      };
    return { roleSet, platformRolesAccess, spaceSettings: space.settings as unknown as ISpaceSettings };
  }

  async getRoleSetAndPlatformRolesWithAccessForCallout(
    calloutID: string
  ): Promise<{
    roleSet?: IRoleSet;
    platformRolesAccess: IPlatformRolesAccess;
    spaceSettings?: ISpaceSettings;
  }> {
    // Find the callout to get its calloutsSetId
    const callout = await this.db.query.callouts.findFirst({
      where: eq(callouts.id, calloutID),
    });

    let space: any = undefined;
    if (callout?.calloutsSetId) {
      const collaboration = await this.db.query.collaborations.findFirst({
        where: eq(collaborations.calloutsSetId, callout.calloutsSetId),
      });
      if (collaboration) {
        space = await this.db.query.spaces.findFirst({
          where: eq(spaces.collaborationId, collaboration.id),
          with: {
            community: {
              with: {
                roleSet: true,
              },
            },
          },
        });
      }
    }

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
    // Find the post by its comments room ID, then its contribution and callout
    const post = await this.db.query.posts.findFirst({
      where: eq(posts.commentsId, roomID),
      with: {
        profile: true,
      },
    });
    if (!post) {
      throw new EntityNotFoundException(
        `Unable to identify Callout with Post contribution for Room: : ${roomID}`,
        LogContext.COLLABORATION
      );
    }

    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.postId, post.id),
      with: {
        callout: true,
      },
    });
    if (!contribution || !contribution.callout) {
      throw new EntityNotFoundException(
        `Unable to identify Callout with Post contribution for Room: : ${roomID}`,
        LogContext.COLLABORATION
      );
    }

    return {
      post: post as unknown as IPost,
      callout: contribution.callout as unknown as ICallout,
      contribution: contribution as unknown as ICalloutContribution,
    };
  }

  async getCalloutForRoom(commentsID: string): Promise<ICallout> {
    const result = await this.db.query.callouts.findFirst({
      where: eq(callouts.commentsId, commentsID),
      with: {
        calloutsSet: true,
      },
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Callout for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result as unknown as ICallout;
  }

  async getCalendarEventForRoom(commentsID: string): Promise<ICalendarEvent> {
    const result = await this.db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.commentsId, commentsID),
      with: { profile: true, comments: true, calendar: true },
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify CalendarEvent for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result as unknown as ICalendarEvent;
  }

  async getDiscussionForRoom(commentsID: string): Promise<IDiscussion> {
    // check if this is a comment related to an calendar
    const result = await this.db.query.discussions.findFirst({
      where: eq(discussions.commentsId, commentsID),
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Discussion for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result as unknown as IDiscussion;
  }

  async getConversationForRoom(roomID: string): Promise<IConversation> {
    const result = await this.db.query.conversations.findFirst({
      where: eq(conversations.roomId, roomID),
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Conversation for Room: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
    return result as unknown as IConversation;
  }
}
