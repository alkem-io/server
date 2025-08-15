import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationInputPlatformInvitation } from './dto/space/notification.dto.input.space.community.invitation.platform';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { InAppNotificationPayloadSpaceCollaborationCalloutPublished } from '../../../platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.collaboration.callout';
import { InAppNotificationPayloadSpaceCollaborationWhiteboardCreated } from '../../../platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.collaboration.whiteboard';
import { InAppNotificationPayloadSpaceCollaborationPostCommentCreated } from '../../../platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.collaboration.post.comment';
import { InAppNotificationPayloadSpaceCommunicationUpdate } from '../../../platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.communication.update';
import { InAppNotificationPayloadSpaceCollaborationPostCreated } from '../../../platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.collaboration.post';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { NotificationInputCalloutPublished } from './dto/space/notification.dto.input.space.collaboration.callout.published';
import { NotificationInputPostCreated } from './dto/space/notification.dto.input.space.collaboration.post.created';
import { NotificationInputWhiteboardCreated } from './dto/space/notification.dto.input.space.collaboration.whiteboard.created';
import { NotificationInputCommunityNewMember } from './dto/space/notification.dto.input.space.community.new.member';
import { NotificationInputCommunityApplication } from './dto/space/notification.dto.input.space.community.application';
import { NotificationInputCommunityInvitation } from './dto/space/notification.dto.input.space.community.invitation';
import { NotificationInputCommunityInvitationVirtualContributor } from './dto/space/notification.dto.input.space.community.invitation.vc';
import { NotificationInputPostComment } from './dto/space/notification.dto.input.space.collaboration.post.comment';
import { NotificationInputUpdateSent } from './dto/space/notification.dto.input.space.communication.update.sent';
import { NotificationInputCommunicationLeadsMessage } from './dto/space/notification.dto.input.space.communication.leads.message';
import { NotificationAdapter } from './notification.adapter';
import { IUser } from '@domain/community/user/user.interface';
import { InAppNotificationPayloadSpaceApplication } from '@platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.application';
import { InAppNotificationPayloadSpaceContributor } from '@platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.contributor';
import { InAppNotificationPayloadSpaceInvitation } from '@platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.invitation';
import { InAppNotificationPayloadSpaceMessageDirect } from '@platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.message.direct';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
@Injectable()
export class NotificationSpaceAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private notificationAdapter: NotificationAdapter,
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
      eventData.callout.id
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
    if (inAppReceiverIDs.length >= 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationCalloutPublished =
        {
          type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_PUBLISHED,
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

  public async spaceCollaborationPostCreated(
    eventData: NotificationInputPostCreated
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COLLABORATION_POST_CREATED;

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
    if (inAppReceiverIDs.length >= 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationPostCreated =
        {
          type: NotificationEventPayload.SPACE_COLLABORATION_POST,
          spaceID: space.id,
          calloutID: eventData.callout.id,
          postID: eventData.post.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_POST_CREATED,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // ALSO send admin notifications
    const adminEvent = NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN;
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
    if (adminInAppReceiverIDs.length >= 0) {
      const adminInAppPayload: InAppNotificationPayloadSpaceCollaborationPostCreated =
        {
          type: NotificationEventPayload.SPACE_COLLABORATION_POST,
          spaceID: space.id,
          calloutID: eventData.callout.id,
          postID: eventData.post.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        adminInAppReceiverIDs,
        adminInAppPayload
      );
    }
  }

  public async spaceCollaborationWhiteboardCreated(
    eventData: NotificationInputWhiteboardCreated
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED;
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
      await this.notificationExternalAdapter.buildSpaceCollaborationWhiteboardCreatedPayload(
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
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationWhiteboardCreated =
        {
          type: NotificationEventPayload.SPACE_COLLABORATION_WHITEBOARD,
          spaceID: space.id,
          calloutID: eventData.callout.id,
          whiteboardID: eventData.whiteboard.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCommunityNewMember(
    eventData: NotificationInputCommunityNewMember
  ): Promise<void> {
    // ALSO send admin notifications
    const adminEvent = NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN;
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );
    const adminRecipients = await this.getNotificationRecipientsSpace(
      adminEvent,
      eventData,
      space.id
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
      const adminInAppPayload: InAppNotificationPayloadSpaceContributor = {
        type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR,
        spaceID: space.id,
        contributorID: eventData.contributorID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        adminInAppReceiverIDs,
        adminInAppPayload
      );
    }

    const event = NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER;

    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id
    );

    // Need to remove the admins that have already received a notification
    const memberOnlyEmailRecipients =
      this.removeAdminRecipientsFromMembersRecipients(
        adminRecipients.emailRecipients,
        recipients.emailRecipients
      );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunityNewMemberPayload(
        event,
        eventData.triggeredBy,
        memberOnlyEmailRecipients,
        space,
        eventData.contributorID
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    const memberOnlyInAppRecipients =
      this.removeAdminRecipientsFromMembersRecipients(
        adminRecipients.inAppRecipients,
        recipients.inAppRecipients
      );

    // Send in-app notifications
    const inAppReceiverIDs = memberOnlyInAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceContributor = {
        type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR,
        spaceID: space.id,
        contributorID: eventData.contributorID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  private removeAdminRecipientsFromMembersRecipients(
    adminRecipients: IUser[],
    memberRecipients: IUser[]
  ): IUser[] {
    // Need to remove the admins that have already received a notification
    const memberOnlyEmailRecipients = memberRecipients.filter(
      email => !adminRecipients.includes(email)
    );
    return memberOnlyEmailRecipients;
  }

  public async spaceCommunityApplicationCreated(
    eventData: NotificationInputCommunityApplication
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT;
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );
    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id
    );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunityApplicationCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        space
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceApplication = {
        type: NotificationEventPayload.SPACE_COMMUNITY_APPLICATION,
        spaceID: space.id,
        applicationID: 'unknown',
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }

    // ALSO send admin notifications
    const adminEvent = NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN;
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
      const adminInAppPayload: InAppNotificationPayloadSpaceApplication = {
        type: NotificationEventPayload.SPACE_COMMUNITY_APPLICATION,
        spaceID: space.id,
        applicationID: 'unknown',
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        adminInAppReceiverIDs,
        adminInAppPayload
      );
    }
  }

  public async spaceCommunityInvitationCreated(
    eventData: NotificationInputCommunityInvitation
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_INVITATION_USER;

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );
    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id,
      eventData.invitedContributorID
    );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunityInvitationCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.invitedContributorID,
        space,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceInvitation = {
        type: NotificationEventPayload.SPACE_COMMUNITY_INVITATION,
        invitationID: eventData.invitationID,
        spaceID: space.id,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNITY_INVITATION_USER,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCommunityInvitationVirtualContributorCreated(
    eventData: NotificationInputCommunityInvitationVirtualContributor
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_INVITATION_VC;
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );
    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id
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
  }

  public async spaceContactLeadsMessage(
    eventData: NotificationInputCommunicationLeadsMessage
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNICATION_MESSAGE_RECIPIENT;
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.communityID
      );
    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunicationLeadsMessageNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        space,
        eventData.message
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceMessageDirect = {
        type: NotificationEventPayload.SPACE_COMMUNICATION_MESSAGE_DIRECT,
        spaceID: space.id,
        message: eventData.message,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNICATION_MESSAGE_RECIPIENT,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCollaborationPostComment(
    eventData: NotificationInputPostComment
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED;

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
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationPostCommentCreated =
        {
          type: NotificationEventPayload.SPACE_COLLABORATION_POST_COMMENT,
          spaceID: space.id,
          postID: eventData.post.id,
          calloutID: 'unknown', // Would need to get from post or context
          messageID: eventData.commentSent.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED,
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
    const event = NotificationEvent.SPACE_COMMUNICATION_UPDATE;
    const community =
      await this.communityResolverService.getCommunityFromUpdatesOrFail(
        eventData.updates.id
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

    // Send the notifications event
    const notificationsPayload =
      await this.notificationExternalAdapter.buildSpaceCommunicationUpdateSentNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        space,
        eventData.updates,
        eventData.lastMessage
      );
    this.notificationExternalAdapter.sendExternalNotifications(
      event,
      notificationsPayload
    );

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
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

    // ALSO send admin notifications
    const adminEvent = NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN;
    const adminRecipients = await this.getNotificationRecipientsSpace(
      adminEvent,
      eventData,
      space.id
    );

    const adminPayload =
      await this.notificationExternalAdapter.buildSpaceCommunicationUpdateSentNotificationPayload(
        adminEvent,
        eventData.triggeredBy,
        adminRecipients.emailRecipients,
        space,
        eventData.updates,
        eventData.lastMessage
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
      const adminInAppPayload: InAppNotificationPayloadSpaceCommunicationUpdate =
        {
          type: NotificationEventPayload.SPACE_COMMUNICATION_UPDATE,
          spaceID: space.id,
          updateID: eventData.updates.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        adminInAppReceiverIDs,
        adminInAppPayload
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
