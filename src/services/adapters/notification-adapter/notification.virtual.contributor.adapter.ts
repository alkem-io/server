import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { NotificationAdapter } from './notification.adapter';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { NotificationInputCommunityInvitationVirtualContributor } from './dto/space/notification.dto.input.space.community.invitation.vc';
import { NotificationInputVirtualContributorSpaceCommunityInvitationDeclined } from './dto/space/notification.dto.input.space.community.invitation.vc.declined';
import { InAppNotificationPayloadVirtualContributor } from '@platform/in-app-notification-payload/dto/virtual-contributor/notification.in.app.payload.virtual.contributor';

@Injectable()
export class NotificationVirtualContributorAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationAdapter: NotificationAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private communityResolverService: CommunityResolverService
  ) {}

  public async spaceCommunityInvitationVirtualContributorCreated(
    eventData: NotificationInputCommunityInvitationVirtualContributor
  ): Promise<void> {
    const event =
      NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION;
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );
    const recipients = await this.getNotificationRecipientsVirtualContributor(
      event,
      eventData,
      undefined, // No specific user recipient for VC invitation - goes to VC admins
      eventData.invitedContributorID
    );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunityInvitationVirtualContributorCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.invitedContributorID,
        eventData.accountHost,
        space,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadVirtualContributor = {
        type: NotificationEventPayload.VIRTUAL_CONTRIBUTOR,
        virtualContributorID: eventData.invitedContributorID,
        space,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION,
        NotificationEventCategory.VIRTUAL_CONTRIBUTOR,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCommunityInvitationVirtualContributorDeclined(
    eventData: NotificationInputVirtualContributorSpaceCommunityInvitationDeclined,
    space: any
  ): Promise<void> {
    const event =
      NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION_DECLINED;

    const recipients = await this.getNotificationRecipientsVirtualContributor(
      event,
      eventData,
      eventData.invitationCreatedBy, // Pass the userID (who sent the invitation)
      eventData.virtualContributorID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildVirtualContributorSpaceCommunityInvitationDeclinedPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.virtualContributorID,
          space
        );

      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadVirtualContributor = {
        type: NotificationEventPayload.VIRTUAL_CONTRIBUTOR,
        virtualContributorID: eventData.virtualContributorID,
        space,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION_DECLINED,
        NotificationEventCategory.VIRTUAL_CONTRIBUTOR,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  private async getNotificationRecipientsVirtualContributor(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    userID: string | undefined,
    virtualContributorID: string
  ): Promise<NotificationRecipientResult> {
    return this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      undefined,
      userID,
      undefined,
      virtualContributorID
    );
  }
}
