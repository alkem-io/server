import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ActivityService } from '@src/platform/activity/activity.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { SubscriptionPublishService } from '../../subscriptions/subscription-service';
import { ActivityInputCalloutPublished } from './dto/activity.dto.input.callout.published';
import { ActivityInputCalloutPostCreated } from './dto/activity.dto.input.callout.post.created';
import { ActivityInputCalloutWhiteboardCreated } from './dto/activity.dto.input.callout.whiteboard.created';
import { ActivityInputCalloutWhiteboardContentModified } from './dto/activity.dto.input.callout.whiteboard.content.modified';
import { ActivityInputMemberJoined } from './dto/activity.dto.input.member.joined';
import { ActivityInputCalloutPostComment } from './dto/activity.dto.input.callout.post.comment';
import { ActivityInputCalloutDiscussionComment } from './dto/activity.dto.input.callout.discussion.comment';
import { ActivityInputChallengeCreated } from './dto/activity.dto.input.challenge.created';
import { ActivityInputOpportunityCreated } from './dto/activity.dto.input.opportunity.created';
import { ActivityInputUpdateSent } from './dto/activity.dto.input.update.sent';
import { Community } from '@domain/community/community/community.entity';
import { ActivityInputMessageRemoved } from './dto/activity.dto.input.message.removed';
import { ActivityInputBase } from './dto/activity.dto.input.base';
import { stringifyWithoutAuthorization } from '@common/utils/stringify.util';
import { ActivityInputCalloutLinkCreated } from './dto/activity.dto.input.callout.link.created';
import { ActivityInputCalendarEventCreated } from './dto/activity.dto.input.calendar.event.created';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';

@Injectable()
export class ActivityAdapter {
  constructor(
    private activityService: ActivityService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly graphqlSubscriptionService: SubscriptionPublishService,
    private readonly timelineResolverService: TimelineResolverService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async challengeCreated(
    eventData: ActivityInputChallengeCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.CHALLENGE_CREATED;
    this.logEventTriggered(eventData, eventType);

    const challenge = eventData.challenge;

    if (!challenge.spaceID) {
      throw new EntityNotInitializedException(
        `Unable to get spaceID of Challenge: ${challenge.id}`,
        LogContext.ACTIVITY
      );
    }

    const collaborationID = await this.getCollaborationIdForSpace(
      challenge.spaceID
    );
    const description = challenge.profile.displayName;

    const activity = await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: challenge.id,
      parentID: challenge.spaceID,
      description,
      type: eventType,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async opportunityCreated(
    eventData: ActivityInputOpportunityCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.OPPORTUNITY_CREATED;
    this.logEventTriggered(eventData, eventType);

    const opportunity = eventData.opportunity;

    const collaborationID = await this.getCollaborationIdForChallenge(
      eventData.challengeId
    );
    const description = opportunity.profile.displayName;

    const activity = await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: opportunity.id,
      parentID: eventData.challengeId,
      description,
      type: eventType,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

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
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async calloutPostCreated(
    eventData: ActivityInputCalloutPostCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.CALLOUT_POST_CREATED;
    this.logEventTriggered(eventData, eventType);

    const post = eventData.post;
    const description = `[${post.profile.displayName}] - ${post.profile.description}`;
    const collaborationID = await this.getCollaborationIdForPost(post.id);
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: post.id,
      parentID: eventData.callout.id,
      description: description,
      type: eventType,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

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
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

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
    }] - ${profile.description.substring(1, 100)}`;
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
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

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
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

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
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

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
    });

    this.graphqlSubscriptionService.publishActivity(
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
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

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
    const description = `[${community.type}] '${eventData.user.nameID}'`;
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.user.id, // the user that joined
      parentID: community.id, // the community that was joined
      description: description,
      type: eventType,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async messageRemoved(
    eventData: ActivityInputMessageRemoved
  ): Promise<boolean> {
    const eventType = ActivityEventType.CHALLENGE_CREATED;
    this.logEventTriggered(eventData, eventType);

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
    const collaborationID = await this.getCollaborationIdFromCommunity(
      communityID
    );

    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: updates.id,
      parentID: communityID,
      description: eventData.message.message,
      type: eventType,
      messageID: eventData.message.id,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  private async getCollaborationIdForSpace(spaceID: string): Promise<string> {
    const [result]: { collaborationId: string }[] =
      await this.entityManager.connection.query(
        `
          SELECT collaboration.id as collaborationId FROM collaboration
          LEFT JOIN space ON space.collaborationId = collaboration.id
          WHERE space.id = '${spaceID}'
        `
      );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Space with ID: ${spaceID}`,
        LogContext.ACTIVITY
      );
    }

    return result.collaborationId;
  }

  private async getCollaborationIdForChallenge(
    challengeID: string
  ): Promise<string> {
    const [result]: { collaborationId: string }[] =
      await this.entityManager.connection.query(
        `
          SELECT collaboration.id as collaborationId FROM collaboration
          LEFT JOIN challenge ON challenge.collaborationId = collaboration.id
          WHERE challenge.id = '${challengeID}'
        `
      );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Challenge with ID: ${challengeID}`,
        LogContext.ACTIVITY
      );
    }

    return result.collaborationId;
  }

  private async getCollaborationIdForCallout(
    calloutID: string
  ): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Whiteboard with ID: ${calloutID}`,
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
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.callouts', 'callouts')
      .leftJoinAndSelect('callouts.contributions', 'contributions')
      .innerJoinAndSelect('contributions.post', 'post')
      .where('post.id = :id')
      .setParameters({ id: `${postID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Whiteboard with ID: ${postID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCollaborationIdForWhiteboard(
    whiteboardID: string
  ): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.callouts', 'callouts')
      .innerJoinAndSelect('callouts.contributions', 'contributions')
      .innerJoinAndSelect('contributions.whiteboard', 'whiteboard')
      .where('whiteboard.id = :id')
      .setParameters({ id: `${whiteboardID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Whiteboard with ID: ${whiteboardID}`,
        LogContext.ACTIVITY
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
        `Unable to identify Whiteboard with ID: ${whiteboardID}`,
        LogContext.ACTIVITY
      );
    }
    return whiteboard.profile.displayName;
  }

  private async getCollaborationIdWithCalloutIdForWhiteboard(
    whiteboardID: string
  ): Promise<{ collaborationID: string; calloutID: string }> {
    const [contributionResult]: {
      collaborationID: string;
      calloutID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`callout\`.\`id\` as \`calloutID\`, \`collaboration\`.\`id\` as collaborationID FROM \`collaboration\`
        LEFT JOIN \`callout\` on \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
        JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
        JOIN \`whiteboard\` on \`whiteboard\`.\`id\` = \`callout_contribution\`.\`whiteboardId\`
        WHERE \`whiteboard\`.\`id\` = '${whiteboardID}'
      `
    );

    if (!contributionResult) {
      const [profileResult]: {
        collaborationID: string;
        calloutID: string;
      }[] = await this.entityManager.connection.query(
        `
          SELECT \`callout\`.\`id\` as \`calloutID\`, \`collaboration\`.\`id\` as collaborationID FROM \`collaboration\`
          LEFT JOIN \`callout\` on \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
          LEFT JOIN \`callout_framing\` on \`callout\`.\`framingId\` = \`callout_framing\`.\`id\`
          WHERE \`callout_framing\`.\`whiteboardId\` = '${whiteboardID}'
        `
      );

      if (!profileResult) {
        throw new EntityNotFoundException(
          `Unable to identify Collaboration for Whiteboard with ID: ${whiteboardID}`,
          LogContext.ACTIVITY
        );
      }
      return profileResult;
    }

    return contributionResult;
  }

  private async getCollaborationIdFromCommunity(communityId: string) {
    const [result]: {
      collaborationId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT collaborationId from \`space\`
        WHERE \`space\`.\`communityId\` = '${communityId}' UNION

        SELECT collaborationId from \`challenge\`
        WHERE \`challenge\`.\`communityId\` = '${communityId}' UNION

        SELECT collaborationId from \`opportunity\`
        WHERE \`opportunity\`.\`communityId\` = '${communityId}';
      `
    );
    if (!result) {
      this.logger.error(
        `Unable to identify Collaboration for provided communityID: ${communityId}`,
        undefined,
        LogContext.COMMUNITY
      );
      return '';
    }
    return result.collaborationId;
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
    const loggedData = stringifyWithoutAuthorization(eventData);
    this.logger.verbose?.(
      `[${eventType}] - received: ${loggedData}`,
      LogContext.ACTIVITY
    );
  }
}
