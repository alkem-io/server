import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { NotificationInputAspectCreated } from './dto/notification.dto.input.aspect.created';
import { NotificationInputCalloutPublished } from './dto/notification.dto.input.callout.published';
import { NotificationInputAspectComment } from './dto/notification.dto.input.aspect.comment';
import { NotificationPayloadBuilder } from './notification.payload.builder';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { ClientProxy } from '@nestjs/microservices';
import { NotificationEventType } from '@alkemio/notifications-lib';
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

  public async calloutPublished(
    eventData: NotificationInputCalloutPublished
  ): Promise<void> {
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
  }

  public async aspectCreated(
    eventData: NotificationInputAspectCreated
  ): Promise<void> {
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
  }

  public async collaborationInterest(
    eventData: NotificationInputCollaborationInterest
  ): Promise<void> {
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
  }

  public async aspectComment(
    eventData: NotificationInputAspectComment
  ): Promise<void> {
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
  }

  public async updateSent(
    eventData: NotificationInputUpdateSent
  ): Promise<void> {
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
  }

  public async discussionCreated(
    eventData: NotificationInputDiscussionCreated
  ): Promise<void> {
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
  }

  public async applicationCreated(
    eventData: NotificationInputCommunityApplication
  ): Promise<void> {
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
  }

  public async communityNewMember(
    eventData: NotificationInputCommunityNewMember
  ): Promise<void> {
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
  }

  public async communityContextReview(
    eventData: NotificationInputCommunityContextReview
  ): Promise<void> {
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
  }

  public async userRegistered(
    eventData: NotificationInputUserRegistered
  ): Promise<void> {
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
  }
}
