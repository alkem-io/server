import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { NotificationInputAspectCreated } from './dto/notification.dto.input.aspect.created';
import { NotificationInputCalloutPublished } from './dto/notification.dto.input.callout.published';
import { NotificationInputAspectComment } from './dto/notification.dto.input.aspect.comment';
import { NotificationPayloadBuilder } from './notification.payload.builder';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { ClientProxy } from '@nestjs/microservices';
import { NotificationEventType } from '@common/enums/notification.event.type';
import { NotificationInputCollaborationInterest } from './dto/notification.dto.input.collaboration.interest';
import { NotificationInputUpdateSent } from './dto/notification.dto.input.update.sent';
import { NotificationInputDiscussionCreated } from './dto/notification.dto.input.discussion.created';
import { NotificationInputCommunityApplication } from './dto/notification.dto.input.community.application';
import { NotificationInputCommunityNewMember } from './dto/notification.dto.input.community.new.member';
import { NotificationInputCommunityContextReview } from './dto/notification.dto.input.community.context.review';
import { NotificationInputUserRegistered } from './dto/notification.dto.input.user.registered';

@Injectable()
export class NotificationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationPayloadBuilder: NotificationPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  async calloutPublished(
    eventData: NotificationInputCalloutPublished
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const payload =
      await this.notificationPayloadBuilder.buildCalloutPublishedPayload(
        eventData.triggeredBy,
        eventData.callout
      );

    this.notificationsClient.emit<number>(
      NotificationEventType.CALLOUT_PUBLISHED,
      payload
    );

    return true;
  }

  async aspectCreated(
    eventData: NotificationInputAspectCreated
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const payload =
      await this.notificationPayloadBuilder.buildAspectCreatedPayload(
        eventData.aspect.id
      );

    this.notificationsClient.emit<number>(
      NotificationEventType.ASPECT_CREATED,
      payload
    );

    return true;
  }

  async collaborationInterest(
    eventData: NotificationInputCollaborationInterest
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const payload =
      await this.notificationPayloadBuilder.buildCollaborationInterestPayload(
        eventData.triggeredBy,
        eventData.collaboration,
        eventData.relation
      );
    this.notificationsClient.emit(
      NotificationEventType.COMMUNITY_COLLABORATION_INTEREST,
      payload
    );

    return true;
  }

  async aspectComment(
    eventData: NotificationInputAspectComment
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    // build notification payload
    const payload =
      await this.notificationPayloadBuilder.buildCommentCreatedOnAspectPayload(
        eventData.aspect.displayName,
        eventData.aspect.createdBy,
        eventData.comments.id,
        eventData.commentSent
      );
    // send notification event
    this.notificationsClient.emit<number>(
      NotificationEventType.COMMENT_CREATED_ON_ASPECT,
      payload
    );

    return true;
  }

  async updateSent(eventData: NotificationInputUpdateSent): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    // Send the notifications event
    const notificationsPayload =
      await this.notificationPayloadBuilder.buildCommunicationUpdateSentNotificationPayload(
        eventData.triggeredBy,
        eventData.updates
      );
    this.notificationsClient.emit<number>(
      NotificationEventType.COMMUNICATION_UPDATE_SENT,
      notificationsPayload
    );

    return true;
  }

  async discussionCreated(
    eventData: NotificationInputDiscussionCreated
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );
    // Emit the events to notify others
    const payload =
      await this.notificationPayloadBuilder.buildCommunicationDiscussionCreatedNotificationPayload(
        eventData.discussion
      );
    this.notificationsClient.emit<number>(
      NotificationEventType.COMMUNICATION_DISCUSSION_CREATED,
      payload
    );

    return true;
  }

  async applicationCreated(
    eventData: NotificationInputCommunityApplication
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const payload =
      await this.notificationPayloadBuilder.buildApplicationCreatedNotificationPayload(
        eventData.triggeredBy,
        eventData.triggeredBy,
        eventData.community
      );

    this.notificationsClient.emit<number>(
      NotificationEventType.COMMUNITY_APPLICATION_CREATED,
      payload
    );

    return true;
  }

  async communityNewMember(
    eventData: NotificationInputCommunityNewMember
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const payload =
      await this.notificationPayloadBuilder.buildCommunityNewMemberPayload(
        eventData.triggeredBy,
        eventData.community
      );
    this.notificationsClient.emit(
      NotificationEventType.COMMUNITY_NEW_MEMBER,
      payload
    );

    return true;
  }

  async communityContextReview(
    eventData: NotificationInputCommunityContextReview
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const payload =
      await this.notificationPayloadBuilder.buildCommunityContextReviewSubmittedNotificationPayload(
        eventData.triggeredBy,
        eventData.community.id,
        eventData.community.parentID,
        eventData.questions
      );
    this.notificationsClient.emit(
      NotificationEventType.COMMUNITY_CONTEXT_REVIEW_SUBMITTED,
      payload
    );

    return true;
  }

  async userRegistered(
    eventData: NotificationInputUserRegistered
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const payload =
      await this.notificationPayloadBuilder.buildUserRegisteredNotificationPayload(
        eventData.triggeredBy
      );

    this.notificationsClient.emit<number>(
      NotificationEventType.USER_REGISTERED,
      payload
    );

    return true;
  }
}
