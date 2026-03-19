import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InAppNotificationPayloadOrganizationMessageDirect } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.direct';
import { InAppNotificationPayloadOrganizationMessageRoom } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.room';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationPushAdapter } from '../notification-push-adapter/notification.push.adapter';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationInputOrganizationMention } from './dto/organization/notification.dto.input.organization.mention';
import { NotificationInputOrganizationMessage } from './dto/organization/notification.input.organization.message';
import { NotificationAdapter } from './notification.adapter';

@Injectable()
export class NotificationOrganizationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationAdapter: NotificationAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private notificationPushAdapter: NotificationPushAdapter,
    private messageDetailsService: MessageDetailsService
  ) {}

  public async organizationMention(
    eventData: NotificationInputOrganizationMention
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_ADMIN_MENTIONED;
    const recipients = await this.getNotificationRecipientsOrganization(
      event,
      eventData,
      eventData.organizationID
    );
    const messageDetails = await this.messageDetailsService.getMessageDetails(
      eventData.roomID,
      eventData.messageID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationMentionNotificationPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.organizationID,
          messageDetails
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
        organizationID: eventData.organizationID,
        roomID: eventData.roomID,
        messageID: eventData.messageID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.ORGANIZATION_ADMIN_MENTIONED,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // Send push notifications
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: 'Organization mentioned',
          body: 'Your organization was mentioned in a conversation',
          url: '/',
        }
      );
    }
  }

  public async organizationSendMessage(
    eventData: NotificationInputOrganizationMessage
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_ADMIN_MESSAGE;
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
        NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // Send push notifications
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: 'New organization message',
          body: 'Your organization received a new message',
          url: '/',
        }
      );
    }

    // And for the sender
    const eventSender = NotificationEvent.ORGANIZATION_MESSAGE_SENDER;
    const recipientsSender = await this.getNotificationRecipientsOrganization(
      eventSender,
      eventData,
      eventData.organizationID
    );

    if (recipientsSender.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildOrganizationMessageNotificationPayload(
          eventSender,
          eventData.triggeredBy,
          recipientsSender.emailRecipients,
          eventData.message,
          eventData.organizationID
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        eventSender,
        payload
      );
    }

    // In-app notification
    const inAppReceiverSenderIDs = recipientsSender.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverSenderIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadOrganizationMessageDirect = {
        type: NotificationEventPayload.ORGANIZATION_MESSAGE_DIRECT,
        organizationID: eventData.organizationID,
        message: eventData.message,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.ORGANIZATION_MESSAGE_SENDER,
        NotificationEventCategory.ORGANIZATION,
        eventData.triggeredBy,
        inAppReceiverSenderIDs,
        inAppPayload
      );
    }

    // Send push notifications for sender confirmation (include the sender)
    if (recipientsSender.pushRecipients.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        recipientsSender.pushRecipients,
        eventSender,
        {
          title: 'Message sent',
          body: 'Your message to the organization was sent',
          url: '/',
        }
      );
    }
  }

  private async getNotificationRecipientsOrganization(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    organizationID: string
  ): Promise<NotificationRecipientResult> {
    return this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      undefined,
      eventData.triggeredBy,
      organizationID
    );
  }
}
