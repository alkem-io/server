import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationInputPlatformInvitation } from './dto/space/notification.dto.input.space.community.invitation.platform';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { InAppNotificationPayloadSpaceCommunicationUpdate } from '../../../platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.communication.update';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { NotificationInputCalloutPublished } from './dto/space/notification.dto.input.space.collaboration.callout.published';
import { NotificationInputCommunityNewMember } from './dto/space/notification.dto.input.space.community.new.member';
import { NotificationInputCommunityApplication } from './dto/space/notification.dto.input.space.community.application';
import { NotificationInputCalloutPostContributionComment } from './dto/space/notification.dto.input.space.collaboration.callout.post.contribution.comment';
import { NotificationInputUpdateSent } from './dto/space/notification.dto.input.space.communication.update.sent';
import { NotificationInputCommunicationLeadsMessage } from './dto/space/notification.dto.input.space.communication.leads.message';
import { NotificationAdapter } from './notification.adapter';
import { IUser } from '@domain/community/user/user.interface';
import { InAppNotificationPayloadSpaceCommunityApplication } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.application';
import { InAppNotificationPayloadSpaceCommunityContributor } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.contributor';
import { InAppNotificationPayloadSpaceCommunicationMessageDirect } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.communication.message.direct';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { InAppNotificationPayloadSpaceCollaborationCallout } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout';
import { NotificationUserAdapter } from './notification.user.adapter';
import { NotificationInputUserMessage } from './dto/user/notification.dto.input.user.message';
import { NotificationInputCalloutContributionCreated } from './dto/space/notification.dto.input.space.collaboration.callout.contribution.created';
@Injectable()
export class NotificationSpaceAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private notificationAdapter: NotificationAdapter,
    private notificationUserAdapter: NotificationUserAdapter,
    private communityResolverService: CommunityResolverService
  ) {}

  public async spaceCollaborationCalloutPublished(
    eventData: NotificationInputCalloutPublished
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED;

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        eventData.callout.id
      );

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );

    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id
    );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCollaborationCalloutPublishedPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        space,
        eventData.callout
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationCallout = {
        type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT,
        spaceID: space.id,
        calloutID: eventData.callout.id,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCollaborationCalloutContributionCreated(
    eventData: NotificationInputCalloutContributionCreated
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION;

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        eventData.callout.id
      );

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );

    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id
    );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCollaborationPostCreatedPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        space,
        eventData
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationCallout = {
        type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT,
        spaceID: space.id,
        calloutID: eventData.callout.id,
        contributionID: eventData.contribution.id,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // ALSO send admin notifications
    const adminEvent =
      NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION;
    const adminRecipients = await this.getNotificationRecipientsSpace(
      adminEvent,
      eventData,
      space.id
    );

    const adminPayload =
      await this.notificationExternalAdapter.buildSpaceCollaborationPostCreatedPayload(
        adminEvent,
        eventData.triggeredBy,
        adminRecipients.emailRecipients,
        space,
        eventData
      );
    this.notificationExternalAdapter.sendExternalNotifications(
      adminEvent,
      adminPayload
    );

    // Send admin in-app notifications
    const adminInAppReceiverIDs = adminRecipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (adminInAppReceiverIDs.length > 0) {
      const adminInAppPayload: InAppNotificationPayloadSpaceCollaborationCallout =
        {
          type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT,
          spaceID: space.id,
          calloutID: eventData.callout.id,
          contributionID: eventData.contribution.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        adminInAppReceiverIDs,
        adminInAppPayload
      );
    }
  }

  public async spaceCommunityNewMember(
    eventData: NotificationInputCommunityNewMember
  ): Promise<void> {
    // ALSO send admin notifications
    const adminEvent = NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER;
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );

    // Notify the user
    await this.notificationUserAdapter.userSpaceCommunityJoined(
      eventData,
      space
    );

    // Notify the admins
    const adminRecipients = await this.getNotificationRecipientsSpace(
      adminEvent,
      eventData,
      space.id,
      eventData.contributorID
    );

    const adminPayload =
      await this.notificationExternalAdapter.buildSpaceCommunityNewMemberPayload(
        adminEvent,
        eventData.triggeredBy,
        adminRecipients.emailRecipients,
        space,
        eventData.contributorID
      );
    this.notificationExternalAdapter.sendExternalNotifications(
      adminEvent,
      adminPayload
    );

    // Send admin in-app notifications
    const adminInAppReceiverIDs = adminRecipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (adminInAppReceiverIDs.length > 0) {
      const adminInAppPayload: InAppNotificationPayloadSpaceCommunityContributor =
        {
          type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR,
          spaceID: space.id,
          contributorID: eventData.contributorID,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        adminInAppReceiverIDs,
        adminInAppPayload
      );
    }
  }

  public async spaceCommunityApplicationCreated(
    eventData: NotificationInputCommunityApplication
  ): Promise<void> {
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );

    // Send to the user
    await this.notificationUserAdapter.userSpaceCommunityApplication(
      eventData,
      space
    );

    const adminEvent = NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION;
    const adminRecipients = await this.getNotificationRecipientsSpace(
      adminEvent,
      eventData,
      space.id
    );

    const adminPayload =
      await this.notificationExternalAdapter.buildSpaceCommunityApplicationCreatedNotificationPayload(
        adminEvent,
        eventData.triggeredBy,
        adminRecipients.emailRecipients,
        space
      );
    this.notificationExternalAdapter.sendExternalNotifications(
      adminEvent,
      adminPayload
    );

    // Send admin in-app notifications
    const adminInAppReceiverIDs = adminRecipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (adminInAppReceiverIDs.length > 0) {
      const adminInAppPayload: InAppNotificationPayloadSpaceCommunityApplication =
        {
          type: NotificationEventPayload.SPACE_COMMUNITY_APPLICATION,
          spaceID: space.id,
          applicationID: 'unknown',
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        adminInAppReceiverIDs,
        adminInAppPayload
      );
    }
  }

  public async spaceContactLeadsMessage(
    eventData: NotificationInputCommunicationLeadsMessage
  ): Promise<void> {
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.communityID
      );

    // Recipient
    const eventRecipient = NotificationEvent.SPACE_ADMIN_COMMUNICATION_MESSAGE;

    const recipients = await this.getNotificationRecipientsSpace(
      eventRecipient,
      eventData,
      space.id
    );
    if (recipients.emailRecipients.length > 0) {
      // Emit the events to notify others
      const payloadRecipients =
        await this.notificationExternalAdapter.buildSpaceCommunicationMessageDirectNotificationPayload(
          eventRecipient,
          eventData.triggeredBy,
          recipients.emailRecipients,
          space,
          eventData.message
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        eventRecipient,
        payloadRecipients
      );
    }

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCommunicationMessageDirect =
        {
          type: NotificationEventPayload.SPACE_COMMUNICATION_MESSAGE_DIRECT,
          spaceID: space.id,
          message: eventData.message,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_ADMIN_COMMUNICATION_MESSAGE,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // And for the sender
    const notificationUserInputMessage: NotificationInputUserMessage = {
      ...eventData,
      triggeredBy: eventData.triggeredBy,
      receiverID: space.id,
    };
    await this.notificationUserAdapter.userCopyOfMessageSent(
      notificationUserInputMessage,
      undefined,
      space.id
    );
  }

  public async spaceCollaborationCalloutContributionComment(
    eventData: NotificationInputCalloutPostContributionComment
  ): Promise<void> {
    const event =
      NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION_COMMENT;

    const community =
      await this.communityResolverService.getCommunityFromPostRoomOrFail(
        eventData.room.id
      );

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );
    const recipients = await this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      space.id
    );
    // build notification payload
    const payload =
      await this.notificationExternalAdapter.buildSpaceCollaborationCommentCreatedOnPostPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        space,
        eventData
      );
    // send notification event
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationCallout = {
        type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT,
        spaceID: space.id,
        contributionID: eventData.post.id,
        calloutID: 'unknown', // Would need to get from post or context
        messageID: eventData.commentSent.id,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION_COMMENT,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCommunicationUpdateSent(
    eventData: NotificationInputUpdateSent
  ): Promise<void> {
    // Get the data needed
    const community =
      await this.communityResolverService.getCommunityFromUpdatesOrFail(
        eventData.updates.id
      );
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );

    const event = NotificationEvent.SPACE_COMMUNICATION_UPDATE;

    const memberRecipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id
    );

    const memberEmailRecipientsWithoutAdmins =
      this.removeAdminRecipientsFromMembersRecipients(
        [memberRecipients.triggeredBy!],
        memberRecipients.emailRecipients
      );

    // Send the notifications event
    const notificationsPayload =
      await this.notificationExternalAdapter.buildSpaceCommunicationUpdateSentNotificationPayload(
        event,
        eventData.triggeredBy,
        memberEmailRecipientsWithoutAdmins,
        space,
        eventData.updates,
        eventData.lastMessage
      );
    this.notificationExternalAdapter.sendExternalNotifications(
      event,
      notificationsPayload
    );

    // Send in-app notifications
    const memberInAppRecipientsWithoutAdmins =
      this.removeAdminRecipientsFromMembersRecipients(
        [memberRecipients.triggeredBy!],
        memberRecipients.inAppRecipients
      );
    const inAppReceiverIDs = memberInAppRecipientsWithoutAdmins.map(
      recipient => recipient.id
    );

    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCommunicationUpdate = {
        type: NotificationEventPayload.SPACE_COMMUNICATION_UPDATE,
        spaceID: space.id,
        updateID: eventData.updates.id,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNICATION_UPDATE,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCommunityPlatformInvitationCreated(
    eventData: NotificationInputPlatformInvitation
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM;

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunityExternalInvitationCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        eventData.invitedUserEmail,
        space,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  private removeAdminRecipientsFromMembersRecipients(
    adminRecipients: IUser[],
    memberRecipients: IUser[]
  ): IUser[] {
    // Need to remove the admins that have already received a notification
    const adminRecipientIds = adminRecipients.map(admin => admin.id);
    const memberOnlyEmailRecipients = memberRecipients.filter(
      member => !adminRecipientIds.includes(member.id)
    );
    return memberOnlyEmailRecipients;
  }

  private async getNotificationRecipientsSpace(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    spaceID: string,
    userID?: string
  ): Promise<NotificationRecipientResult> {
    return this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      spaceID,
      userID
    );
  }
}
