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
import { SubscriptionPublishService } from '../../subscriptions/subscription-publish-service';
import { ActivityInputCalloutPublished } from './dto/activity.dto.input.callout.published';
import { ActivityInputPostCreated } from './dto/activity.dto.input.post.created';
import { ActivityInputWhiteboardCreated } from './dto/activity.dto.input.whiteboard.created';
import { ActivityInputMemberJoined } from './dto/activity.dto.input.member.joined';
import { ActivityInputPostComment } from './dto/activity.dto.input.post.comment';
import { ActivityInputCalloutDiscussionComment } from './dto/activity.dto.input.callout.discussion.comment';
import { ActivityInputChallengeCreated } from './dto/activity.dto.input.challenge.created';
import { ActivityInputOpportunityCreated } from './dto/activity.dto.input.opportunity.created';
import { ActivityInputUpdateSent } from './dto/activity.dto.input.update.sent';
import { Community } from '@domain/community/community/community.entity';
import { ActivityInputMessageRemoved } from './dto/activity.dto.input.message.removed';
import { ActivityInputBase } from './dto/activity.dto.input.base';
import { stringifyWithoutAuthorization } from '@common/utils/stringify.util';

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
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly graphqlSubscriptionService: SubscriptionPublishService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async challengeCreated(
    eventData: ActivityInputChallengeCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.CHALLENGE_CREATED;
    this.logEventTriggered(eventData, eventType);

    const challenge = eventData.challenge;

    if (!challenge.hubID) {
      throw new EntityNotInitializedException(
        `Unable to get hubID of Challenge: ${challenge.id}`,
        LogContext.ACTIVITY
      );
    }

    const collaborationID = await this.getCollaborationIdForHub(
      challenge.hubID
    );
    const description = challenge.profile.displayName;

    const activity = await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: challenge.id,
      parentID: challenge.hubID,
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
    const description = `[${callout.profile.displayName}] - ${callout.profile.description}`;
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

  public async postCreated(
    eventData: ActivityInputPostCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.POST_CREATED;
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

  public async postComment(
    eventData: ActivityInputPostComment
  ): Promise<boolean> {
    const eventType = ActivityEventType.POST_COMMENT;
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

  public async whiteboardCreated(
    eventData: ActivityInputWhiteboardCreated
  ): Promise<boolean> {
    const eventType = ActivityEventType.WHITEBOARD_CREATED;
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

  private async getCollaborationIdForHub(hubID: string): Promise<string> {
    const [result]: { collaborationId: string }[] =
      await this.entityManager.connection.query(
        `
          SELECT collaboration.id as collaborationId FROM collaboration
          LEFT JOIN hub ON hub.collaborationId = collaboration.id
          WHERE hub.id = '${hubID}'
        `
      );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Hub with ID: ${hubID}`,
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
      .innerJoinAndSelect('callout.posts', 'post')
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
      .innerJoinAndSelect('callouts.posts', 'post')
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
      .innerJoinAndSelect('callouts.whiteboardes', 'whiteboard')
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

  private async getCollaborationIdFromCommunity(communityId: string) {
    const [result]: {
      collaborationId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT collaborationId from \`hub\`
        WHERE \`hub\`.\`communityId\` = '${communityId}' UNION

        SELECT collaborationId from \`challenge\`
        WHERE \`challenge\`.\`communityId\` = '${communityId}' UNION

        SELECT collaborationId from \`opportunity\`
        WHERE \`opportunity\`.\`communityId\` = '${communityId}';
      `
    );
    if (!result) {
      this.logger.error(
        `Unable to identify Collaboration for provided communityID: ${communityId}`,
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
