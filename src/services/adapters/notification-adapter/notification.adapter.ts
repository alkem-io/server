import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils';
import { NotificationInputUserMessage } from './dto/user/notification.dto.input.user.message';
import { NotificationInputOrganizationMessage } from './dto/organization/notification.input.organization.message';
import { NotificationInputEntityMentions } from './dto/user/notification.dto.input.entity.mentions';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { NotificationInputCommentReply } from './dto/space/notification.dto.input.space.communication.user.comment.reply';
import { NotificationInputOrganizationMention } from './dto/organization/notification.dto.input.organization.mention';
import { NotificationInputUserMention } from './dto/user/notification.dto.input.user.mention';
import { InAppNotificationPayloadOrganizationMessageRoom } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.room';
import { InAppNotificationPayloadOrganizationMessageDirect } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.direct';
import { InAppNotificationPayloadUserMessageRoom } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.room';
import { InAppNotificationPayloadUserMessageDirect } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.direct';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@Injectable()
export class NotificationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationsRecipientsService: NotificationRecipientsService,
    private notificationInAppAdapter: NotificationInAppAdapter
  ) {}

  public async organizationMention(
    eventData: NotificationInputOrganizationMention
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_MENTIONED;
    const recipients = await this.getNotificationRecipientsOrganization(
      event,
      eventData,
      eventData.mentionedEntityID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationMentionNotificationPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.mentionedEntityID,
          eventData.comment,
          eventData.originEntity.id,
          eventData.originEntity.displayName,
          eventData.commentType
        );

      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // In-app notification
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationMessageRoom = {
        type: NotificationEventPayload.ORGANIZATION_MESSAGE_ROOM,
        organizationID: eventData.mentionedEntityID,
        roomID: eventData.originEntity.id,
        messageID: eventData.commentsId || 'unknown',
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.ORGANIZATION_MENTIONED,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async organizationSendMessage(
    eventData: NotificationInputOrganizationMessage
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT;
    const recipients = await this.getNotificationRecipientsOrganization(
      event,
      eventData,
      eventData.organizationID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationMessageNotificationPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.message,
          eventData.organizationID
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // In-app notification
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationMessageDirect = {
        type: NotificationEventPayload.ORGANIZATION_MESSAGE_DIRECT,
        organizationID: eventData.organizationID,
        message: eventData.message,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async userCommentReply(
    eventData: NotificationInputCommentReply
  ): Promise<void> {
    const event = NotificationEvent.USER_COMMENT_REPLY;
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.commentOwnerID
    );

    try {
      if (recipients.emailRecipients.length > 0) {
        const payload =
          await this.notificationExternalAdapter.buildUserCommentReplyPayload(
            event,
            eventData.triggeredBy,
            recipients.emailRecipients,
            eventData
          );

        this.notificationExternalAdapter.sendExternalNotifications(
          event,
          payload
        );
      }

      // In-app notification
      const inAppReceiverIDs = recipients.inAppRecipients.map(
        recipient => recipient.id
      );
      if (inAppReceiverIDs.length > 0) {
        const commentOriginUrl =
          await this.notificationExternalAdapter.buildCommentOriginUrl(
            eventData.commentType,
            eventData.originEntity.id
          );

        const inAppPayload: InAppNotificationPayloadUserMessageRoom = {
          type: NotificationEventPayload.USER_MESSAGE_ROOM,
          userID: eventData.commentOwnerID,
          roomID: eventData.roomId,
          comment: eventData.reply,
          commentUrl: commentOriginUrl,
          commentOriginName: eventData.originEntity.displayName,
        };

        await this.notificationInAppAdapter.sendInAppNotifications(
          NotificationEvent.USER_COMMENT_REPLY,
          NotificationEventCategory.USER,
          eventData.triggeredBy,
          inAppReceiverIDs,
          inAppPayload
        );
      }
    } catch (error: any) {
      this.logger.error(
        'Error while building comment reply notification payload',
        LogContext.NOTIFICATIONS,
        { error: error?.message }
      );
    }
  }

  public async userMessageSend(
    eventData: NotificationInputUserMessage
  ): Promise<void> {
    const event = NotificationEvent.USER_MESSAGE_RECIPIENT;
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.receiverID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildUserMessageNotificationPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.receiverID,
          eventData.message
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // In-app notification
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadUserMessageDirect = {
        type: NotificationEventPayload.USER_MESSAGE_DIRECT,
        userID: eventData.receiverID,
        message: eventData.message,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.USER_MESSAGE_RECIPIENT,
        NotificationEventCategory.USER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async userMention(
    eventData: NotificationInputUserMention
  ): Promise<void> {
    const event = NotificationEvent.USER_MENTION;
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.mentionedEntityID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildUserMentionNotificationPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.mentionedEntityID,
          eventData.comment,
          eventData.originEntity.id,
          eventData.originEntity.displayName,
          eventData.commentType
        );

      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // In-app notification
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload = await this.buildUserMentionInAppPayload(eventData);

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.USER_MENTION,
        NotificationEventCategory.USER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  private async buildUserMentionInAppPayload(
    eventData: NotificationInputUserMention
  ): Promise<InAppNotificationPayloadUserMessageRoom> {
    const commentOriginUrl =
      await this.notificationExternalAdapter.buildCommentOriginUrl(
        eventData.commentType,
        eventData.originEntity.id
      );

    return {
      type: NotificationEventPayload.USER_MESSAGE_ROOM,
      userID: eventData.mentionedEntityID,
      comment: eventData.comment,
      commentUrl: commentOriginUrl,
      commentOriginName: eventData.originEntity.displayName,
    };
  }

  public async entityMentions(
    eventData: NotificationInputEntityMentions
  ): Promise<void> {
    for (const mention of eventData.mentions) {
      const entityMentionNotificationInput: NotificationInputUserMention = {
        triggeredBy: eventData.triggeredBy,
        comment: eventData.comment,
        mentionedEntityID: mention.id,
        commentsId: eventData.roomId,
        originEntity: eventData.originEntity,
        commentType: eventData.commentType,
      };

      if (mention.type == MentionedEntityType.USER) {
        this.userMention(entityMentionNotificationInput);
      }
      if (mention.type == MentionedEntityType.ORGANIZATION) {
        this.organizationMention(entityMentionNotificationInput);
      }
    }
  }

  private async getNotificationRecipientsUser(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    userID?: string
  ): Promise<NotificationRecipientResult> {
    return this.getNotificationRecipients(event, eventData, undefined, userID);
  }

  private async getNotificationRecipientsOrganization(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    organizationID: string
  ): Promise<NotificationRecipientResult> {
    return this.getNotificationRecipients(
      event,
      eventData,
      undefined,
      undefined,
      organizationID
    );
  }

  public async getNotificationRecipients(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    entityID?: string,
    userID?: string,
    organizationID?: string
  ): Promise<NotificationRecipientResult> {
    this.logEventTriggered(eventData, event);

    const recipients = await this.notificationsRecipientsService.getRecipients({
      eventType: event,
      spaceID: entityID,
      userID,
      organizationID,
    });
    return recipients;
  }

  private logEventTriggered(
    eventData: NotificationInputBase,
    eventType: NotificationEvent
  ) {
    // Stringify without authorization information
    const loggedData = stringifyWithoutAuthorizationMetaInfo(eventData);
    this.logger.verbose?.(
      `[${eventType}] - received: ${loggedData}`,
      LogContext.NOTIFICATIONS
    );
  }
}
