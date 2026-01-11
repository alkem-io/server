import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ActivityService } from '@src/platform/activity/activity.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { EntityNotFoundException } from '@common/exceptions';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { SubscriptionPublishService } from '../../subscriptions/subscription-service';
import { ActivityInputCalloutPublished } from './dto/activity.dto.input.callout.published';
import { ActivityInputCalloutPostCreated } from './dto/activity.dto.input.callout.post.created';
import { ActivityInputCalloutWhiteboardCreated } from './dto/activity.dto.input.callout.whiteboard.created';
import { ActivityInputCalloutWhiteboardContentModified } from './dto/activity.dto.input.callout.whiteboard.content.modified';
import { ActivityInputCalloutMemoCreated } from './dto/activity.dto.input.callout.memo.created';
import { ActivityInputMemberJoined } from './dto/activity.dto.input.member.joined';
import { ActivityInputCalloutPostComment } from './dto/activity.dto.input.callout.post.comment';
import { ActivityInputCalloutDiscussionComment } from './dto/activity.dto.input.callout.discussion.comment';
import { ActivityInputSubspaceCreated } from './dto/activity.dto.input.subspace.created';
import { ActivityInputUpdateSent } from './dto/activity.dto.input.update.sent';
import { Community } from '@domain/community/community/community.entity';
import { ActivityInputMessageRemoved } from './dto/activity.dto.input.message.removed';
import { ActivityInputBase } from './dto/activity.dto.input.base';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils/stringify.util';
import { ActivityInputCalloutLinkCreated } from './dto/activity.dto.input.callout.link.created';
import { ActivityInputCalendarEventCreated } from './dto/activity.dto.input.calendar.event.created';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { Space } from '@domain/space/space/space.entity';

@Injectable()
export class ActivityAdapter {
  constructor(
    private activityService: ActivityService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    @InjectRepository(Memo)
    private memoRepository: Repository<Memo>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly graphqlSubscriptionService: SubscriptionPublishService,
    private readonly timelineResolverService: TimelineResolverService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async subspaceCreated(
    eventData: ActivityInputSubspaceCreated
  ): Promise<boolean> {
    const subspace = await this.entityManager.findOne(Space, {
      where: {
        id: eventData.subspace.id,
      },
      relations: {
        about: {
          profile: true,
        },
        parentSpace: {
          collaboration: true,
        },
      },
    });
    if (
      !subspace ||
      !subspace.about.profile ||
      !subspace.parentSpace ||
      !subspace.parentSpace.collaboration
    ) {
      throw new EntityNotFoundException(
        `Unable to find Subspace with all needed entities: ${eventData.subspace.id}`,
        LogContext.ACTIVITY
      );
    }
    const eventType = ActivityEventType.SUBSPACE_CREATED;

    this.logEventTriggered(eventData, eventType);

    const collaborationID = subspace.parentSpace.collaboration.id;
    const description = subspace.about.profile.displayName;

    const activity = await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: subspace.id,
      parentID: subspace.parentSpace.id,
      description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async calloutPublished(
    eventData: ActivityInputCalloutPublished
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALLOUT_PUBLISHED;
    this.logEventTriggered(eventData, eventType);

    const callout = eventData.callout;
    const collaborationID = await this.getCollaborationIdForCallout(callout.id);
    const description = `[${callout.framing.profile.displayName}] - ${callout.framing.profile.description}`;
    const activity = await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: callout.id,
      parentID: collaborationID,
      description: description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async calloutPostCreated(
    eventData: ActivityInputCalloutPostCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALLOUT_POST_CREATED;
    this.logEventTriggered(eventData, eventType);

    const post = eventData.post;
    const description = `[${post.profile.displayName}] - ${post.profile.description}`;

    let collaborationID: string;
    try {
      collaborationID = await this.getCollaborationIdForPost(post.id);
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        this.logger.warn(
          {
            message:
              'Skipping activity creation; post was deleted before activity could be recorded',
            postId: post.id,
            calloutId: eventData.callout.id,
          },
          LogContext.ACTIVITY
        );
        return false;
      }
      throw error;
    }

    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: post.id,
      parentID: eventData.callout.id,
      description: description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async calloutLinkCreated(
    eventData: ActivityInputCalloutLinkCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALLOUT_LINK_CREATED;
    this.logEventTriggered(eventData, eventType);

    const link = eventData.link;
    const description = `[${eventData.callout.framing.profile.displayName}] - ${link.profile.displayName}`;
    const collaborationID = await this.getCollaborationIdForCallout(
      eventData.callout.id
    );
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: link.id,
      parentID: eventData.callout.id,
      description: description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async calendarEventCreated(
    eventData: ActivityInputCalendarEventCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALENDAR_EVENT_CREATED;
    this.logEventTriggered(eventData, eventType);

    const profile = eventData.calendarEvent.profile;
    const description = `[${
      profile.displayName
    }] - ${profile.description?.substring(1, 100) ?? ''}`;
    const collaborationID =
      await this.timelineResolverService.getCollaborationIdForCalendar(
        eventData.calendar.id
      );
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.calendarEvent.id,
      parentID: eventData.calendar.id,
      description: description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async calloutPostComment(
    eventData: ActivityInputCalloutPostComment
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALLOUT_POST_COMMENT;
    this.logEventTriggered(eventData, eventType);

    const postID = eventData.post.id;
    const calloutID = await this.getCalloutIdForPost(postID);
    const collaborationID = await this.getCollaborationIdForCallout(calloutID);
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: postID,
      parentID: calloutID,
      description: eventData.message.message,
      type: eventType,
      messageID: eventData.message.id,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async calloutWhiteboardCreated(
    eventData: ActivityInputCalloutWhiteboardCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALLOUT_WHITEBOARD_CREATED;
    this.logEventTriggered(eventData, eventType);

    const whiteboard = eventData.whiteboard;
    const collaborationID = await this.getCollaborationIdForWhiteboard(
      whiteboard.id
    );

    const description = `[${whiteboard.profile.displayName}]`;
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: whiteboard.id,
      parentID: eventData.callout.id,
      description: description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async calloutMemoCreated(
    eventData: ActivityInputCalloutMemoCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALLOUT_MEMO_CREATED;
    this.logEventTriggered(eventData, eventType);

    const memo = eventData.memo;
    const collaborationID = await this.getCollaborationIdForMemo(memo.id);
    const memoDisplayName = await this.getMemoDisplayName(memo.id);

    const description = `[${memoDisplayName}]`;
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: memo.id,
      parentID: eventData.callout.id,
      description: description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async calloutWhiteboardContentModified(
    eventData: ActivityInputCalloutWhiteboardContentModified
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED;
    this.logEventTriggered(eventData, eventType);

    const whiteboardDisplayName = await this.getWhiteboardDisplayName(
      eventData.whiteboardId
    );
    const parentEntities =
      await this.getCollaborationIdWithCalloutIdForWhiteboard(
        eventData.whiteboardId
      );

    const description = `[${whiteboardDisplayName}]`;
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID: parentEntities.collaborationID,
      resourceID: eventData.whiteboardId,
      parentID: parentEntities.calloutID,
      description: description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      parentEntities.collaborationID,
      activity
    );

    return true;
  }

  public async calloutCommentCreated(
    eventData: ActivityInputCalloutDiscussionComment
  ): Promise<boolean> {
    const eventType = ActivityEventType.DISCUSSION_COMMENT;
    this.logEventTriggered(eventData, eventType);

    const collaborationID = await this.getCollaborationIdForCallout(
      eventData.callout.id
    );

    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.callout.id,
      parentID: collaborationID,
      description: eventData.message.message,
      type: eventType,
      messageID: eventData.message.id,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  public async memberJoined(
    eventData: ActivityInputMemberJoined
  ): Promise<boolean> {
    const eventType = ActivityEventType.MEMBER_JOINED;
    this.logEventTriggered(eventData, eventType);

    const community = eventData.community;
    const collaborationID = await this.getCollaborationIdFromCommunity(
      community.id
    );
    const description = `${eventData.actorId}`;
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.actorId, // the actor that joined
      parentID: community.id, // the community that was joined
      description: description,
      type: eventType,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  private async getCollaborationIdFromCommunity(communityID: string) {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          id: communityID,
        },
      },
      relations: {
        collaboration: true,
      },
    });
    if (!space || !space.collaboration) {
      throw new EntityNotFoundException(
        `Unable to find Collaboration for Community with ID: ${communityID}`,
        LogContext.ACTIVITY
      );
    }
    return space.collaboration.id;
  }

  public async messageRemoved(
    eventData: ActivityInputMessageRemoved
  ): Promise<boolean> {
    //const eventType = ActivityEventType.MESSAGE_REMOVED;
    //this.logEventTriggered(eventData, eventType);

    const activity = await this.activityService.getActivityForMessage(
      eventData.messageID
    );
    if (activity) {
      // todo: log another activity entry to record the removal or not?
      await this.activityService.updateActivityVisibility(activity, false);
      // todo: trigger a subscription to update other clients?
      //this.graphqlSubscriptionService.publishActivity(collaborationID, activity);
    }

    return true;
  }

  public async updateSent(
    eventData: ActivityInputUpdateSent
  ): Promise<boolean> {
    const eventType = ActivityEventType.UPDATE_SENT;
    this.logEventTriggered(eventData, eventType);

    const updates = eventData.updates;
    const communityID = await this.getCommunityIdFromUpdates(updates.id);
    const collaborationID =
      await this.getCollaborationIdFromCommunity(communityID);

    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: updates.id,
      parentID: communityID,
      description: eventData.message.message,
      type: eventType,
      messageID: eventData.message.id,
      visibility: true,
    });

    void this.graphqlSubscriptionService.publishActivity(
      collaborationID,
      activity
    );

    return true;
  }

  private async getCollaborationIdForSpace(spaceID: string): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        id: spaceID,
      },
      relations: {
        collaboration: true,
      },
    });
    if (!space || !space.collaboration) {
      throw new EntityNotFoundException(
        `Unable to find collaboration for spaceID: ${spaceID}`,
        LogContext.COLLABORATION
      );
    }

    return space.collaboration.id;
  }

  private async getCollaborationIdForCallout(
    calloutID: string
  ): Promise<string> {
    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        calloutsSet: {
          callouts: {
            id: calloutID,
          },
        },
      },
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Callout with ID: ${calloutID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCalloutIdForPost(postID: string): Promise<string> {
    const callout = await this.calloutRepository
      .createQueryBuilder('callout')
      .leftJoinAndSelect('callout.contributions', 'contributions')
      .innerJoinAndSelect('contributions.post', 'post')
      .where('post.id = :id')
      .setParameters({ id: `${postID}` })
      .getOne();
    if (!callout) {
      throw new EntityNotFoundException(
        `Unable to identify Callout for Post with ID: ${postID}`,
        LogContext.ACTIVITY
      );
    }
    return callout.id;
  }

  private async getCollaborationIdForPost(postID: string): Promise<string> {
    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        calloutsSet: {
          callouts: {
            contributions: {
              post: {
                id: postID,
              },
            },
          },
        },
      },
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Post with ID: ${postID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCollaborationIdForWhiteboard(
    whiteboardID: string
  ): Promise<string> {
    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        calloutsSet: {
          callouts: {
            contributions: {
              whiteboard: {
                id: whiteboardID,
              },
            },
          },
        },
      },
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Whiteboard with ID: ${whiteboardID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCollaborationIdForMemo(memoID: string): Promise<string> {
    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        calloutsSet: {
          callouts: {
            contributions: {
              memo: {
                id: memoID,
              },
            },
          },
        },
      },
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        'Unable to identify Collaboration for Memo',
        LogContext.ACTIVITY,
        { memoID }
      );
    }
    return collaboration.id;
  }

  private async getWhiteboardDisplayName(
    whiteboardID: string
  ): Promise<string> {
    const whiteboard = await this.whiteboardRepository
      .createQueryBuilder('whiteboard')
      .leftJoinAndSelect('whiteboard.profile', 'profile')
      .where({ id: whiteboardID })
      .getOne();
    if (!whiteboard) {
      throw new EntityNotFoundException(
        'Unable to identify Whiteboard',
        LogContext.ACTIVITY,
        { whiteboardID }
      );
    }
    return whiteboard.profile.displayName;
  }

  private async getMemoDisplayName(memoID: string): Promise<string> {
    const memo = await this.memoRepository
      .createQueryBuilder('memo')
      .leftJoinAndSelect('memo.profile', 'profile')
      .where({ id: memoID })
      .getOne();
    if (!memo) {
      throw new EntityNotFoundException(
        'Unable to identify Memo',
        LogContext.ACTIVITY,
        { memoID }
      );
    }
    return memo.profile.displayName;
  }

  private async getCollaborationIdWithCalloutIdForWhiteboard(
    whiteboardID: string
  ): Promise<{ collaborationID: string; calloutID: string }> {
    const callout = await this.entityManager
      .createQueryBuilder(Callout, 'callout')
      .leftJoinAndSelect('callout.contributions', 'contributions')
      .leftJoinAndSelect('callout.framing', 'framing')
      .leftJoinAndSelect('framing.whiteboard', 'framingWhiteboard')
      .leftJoinAndSelect('contributions.whiteboard', 'whiteboard')
      .where('whiteboard.id = :whiteboardID', { whiteboardID })
      .orWhere('framingWhiteboard.id = :whiteboardID', { whiteboardID })
      .getOne();
    if (!callout) {
      throw new EntityNotFoundException(
        `Unable to identify Callout for Whiteboard with ID: ${whiteboardID}`,
        LogContext.ACTIVITY
      );
    }

    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        calloutsSet: {
          callouts: {
            id: callout.id,
          },
        },
      },
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for callout with ID: ${callout.id}`,
        LogContext.ACTIVITY
      );
    }

    return { collaborationID: collaboration.id, calloutID: callout.id };
  }

  private async getCommunityIdFromUpdates(updatesID: string) {
    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.communication', 'communication')
      .leftJoinAndSelect('communication.updates', 'updates')
      .where('updates.id = :updatesID')
      .setParameters({
        updatesID: `${updatesID}`,
      })
      .getOne();
    if (!community) {
      this.logger.error(
        `Unable to identify Community for provided updates: ${updatesID}`,
        undefined,
        LogContext.COMMUNITY
      );
      return '';
    }
    return community.id;
  }

  private logEventTriggered(
    eventData: ActivityInputBase,
    eventType: ActivityEventType
  ) {
    // Stringify without authorization information
    const loggedData = stringifyWithoutAuthorizationMetaInfo(eventData);
    this.logger.verbose?.(
      `[${eventType}] - received: ${loggedData}`,
      LogContext.ACTIVITY
    );
  }
}
