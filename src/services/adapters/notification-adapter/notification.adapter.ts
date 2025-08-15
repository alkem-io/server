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
import { InAppNotificationOrganizationMentionedPayload } from '../notification-in-app-adapter/dto/organization/notification.in.app.organization.mentioned.payload';
import { InAppNotificationOrganizationMessageRecipientPayload } from '../notification-in-app-adapter/dto/organization/notification.in.app.organization.message.recipient.payload';
import { InAppNotificationUserCommentReplyPayload } from '../notification-in-app-adapter/dto/user/notification.in.app.user.comment.reply.payload';
import { InAppNotificationUserMessageRecipientPayload } from '../notification-in-app-adapter/dto/user/notification.in.app.user.message.recipient.payload';
import { InAppNotificationUserMentionedPayload } from '../notification-in-app-adapter/dto/user/notification.in.app.user.mentioned.payload';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { NotificationInputCommentReply } from './dto/space/notification.dto.input.space.communication.user.comment.reply';
import { NotificationInputOrganizationMention } from './dto/organization/notification.dto.input.organization.mention';
import { NotificationInputUserMention } from './dto/user/notification.dto.input.user.mention';

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
      eventData.originEntity.id
    );
    // Emit the events to notify others
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

    if (payload) {
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );

      // Send in-app notifications
      const inAppReceiverIDs = recipients.inAppRecipients.map(
        recipient => recipient.id
      );
      if (inAppReceiverIDs.length > 0) {
        const inAppPayload: InAppNotificationOrganizationMentionedPayload = {
          type: NotificationEvent.ORGANIZATION_MENTIONED,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.ORGANIZATION,
          triggeredAt: new Date(),
          organizationID: eventData.mentionedEntityID,
          commentID: eventData.commentsId || 'unknown',
          commentContent: eventData.comment,
          commentOrigin: {
            displayName: eventData.originEntity.displayName,
            url: 'unknown', // Would need to be constructed
          },
        };

        await this.notificationInAppAdapter.sendInAppNotifications(
          inAppPayload,
          inAppReceiverIDs
        );
      }
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
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildOrganizationMessageNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.message,
        eventData.organizationID
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationOrganizationMessageRecipientPayload =
        {
          type: NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.ORGANIZATION,
          triggeredAt: new Date(),
          organizationID: eventData.organizationID,
          messageID: 'unknown', // Would need message ID from event data
          messageContent: eventData.message,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
      // build notification payload
      const payload =
        await this.notificationExternalAdapter.buildUserCommentReplyPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData
        );
      // send notification event
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );

      // Send in-app notifications
      const inAppReceiverIDs = recipients.inAppRecipients.map(
        recipient => recipient.id
      );
      if (inAppReceiverIDs.length > 0) {
        const inAppPayload: InAppNotificationUserCommentReplyPayload = {
          type: NotificationEvent.USER_COMMENT_REPLY,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.USER,
          triggeredAt: new Date(),
          originalMessage: {
            roomID: 'unknown', // Would need original message room ID
            messageID: 'unknown', // Would need original message ID
          },
          replyMessage: {
            roomID: 'unknown', // Would need reply message room ID
            messageID: 'unknown', // Would need reply message ID
          },
        };

        await this.notificationInAppAdapter.sendInAppNotifications(
          inAppPayload,
          inAppReceiverIDs
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error while building comment reply notification payload ${error?.message}`,
        error?.stack,
        LogContext.NOTIFICATIONS
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
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildUserMessageNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.receiverID,
        eventData.message
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationUserMessageRecipientPayload = {
        type: NotificationEvent.USER_MESSAGE_RECIPIENT,
        triggeredByID: eventData.triggeredBy,
        category: NotificationEventCategory.USER,
        triggeredAt: new Date(),
        message: eventData.message,
        senderUserID: eventData.triggeredBy,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
    // Emit the events to notify others
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

    if (payload) {
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );

      // Send in-app notifications
      const inAppReceiverIDs = recipients.inAppRecipients.map(
        recipient => recipient.id
      );
      if (inAppReceiverIDs.length > 0) {
        const inAppPayload: InAppNotificationUserMentionedPayload = {
          type: NotificationEvent.USER_MENTION,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.USER,
          triggeredAt: new Date(),
          message: {
            roomID: eventData.commentsId || 'unknown',
            messageID: 'unknown', // Would need actual message ID
          },
        };

        await this.notificationInAppAdapter.sendInAppNotifications(
          inAppPayload,
          inAppReceiverIDs
        );
      }
    }
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
