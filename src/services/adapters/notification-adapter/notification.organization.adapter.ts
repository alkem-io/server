import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { NotificationAdapter } from './notification.adapter';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { InAppNotificationPayloadOrganizationMessageDirect } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.direct';
import { NotificationInputOrganizationMessage } from './dto/organization/notification.input.organization.message';
import { InAppNotificationPayloadOrganizationMessageRoom } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.room';
import { NotificationInputOrganizationMention } from './dto/organization/notification.dto.input.organization.mention';

@Injectable()
export class NotificationOrganizationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationAdapter: NotificationAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter
  ) {}

  public async organizationMention(
    eventData: NotificationInputOrganizationMention
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_ADMIN_MENTIONED;
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
        NotificationEvent.ORGANIZATION_ADMIN_MENTIONED,
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
      undefined,
      organizationID
    );
  }
}
