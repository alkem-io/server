import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationInputPlatformInvitation } from './dto/space/notification.dto.input.space.community.invitation.platform';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { InAppNotificationSpaceCollaborationCalloutPublishedPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.callout.published.payload';
import { InAppNotificationSpaceCommunityNewMemberPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.new.member.payload';
import { InAppNotificationSpaceCommunityApplicationApplicantPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.application.applicant.payload';
import { InAppNotificationSpaceCommunityInvitationUserPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.invitation.user.payload';
import { InAppNotificationSpaceCommunicationMessageRecipientPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.communication.message.recipient.payload';
import { InAppNotificationSpaceCollaborationWhiteboardCreatedPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.whiteboard.created.payload';
import { InAppNotificationSpaceCollaborationPostCommentCreatedPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.post.comment.created.payload';
import { InAppNotificationSpaceCommunicationUpdatePayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.communication.update.payload';
import { InAppNotificationSpaceCommunityNewMemberAdminPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.new.member.admin.payload';
import { InAppNotificationSpaceCommunityApplicationAdminPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.application.admin.payload';
import { InAppNotificationSpaceCommunicationUpdateAdminPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.communication.update.admin.payload';
import { InAppNotificationSpaceCollaborationPostCreatedAdminPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.post.created.admin.payload';
import { InAppNotificationSpaceCollaborationPostCreatedPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.post.created.payload';
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
      const inAppPayload: InAppNotificationSpaceCollaborationCalloutPublishedPayload =
        {
          type: NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_MEMBER,
          triggeredAt: new Date(),
          calloutID: eventData.callout.id,
          spaceID: space.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
      const inAppPayload: InAppNotificationSpaceCollaborationPostCreatedPayload =
        {
          type: NotificationEvent.SPACE_COLLABORATION_POST_CREATED,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_MEMBER,
          triggeredAt: new Date(),
          calloutID: eventData.callout.id,
          postID: eventData.post.id,
          spaceID: space.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
      const adminInAppPayload: InAppNotificationSpaceCollaborationPostCreatedAdminPayload =
        {
          type: NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_ADMIN,
          triggeredAt: new Date(),
          calloutID: eventData.callout.id,
          postID: eventData.post.id,
          spaceID: space.id,
          message: {
            roomID: 'unknown',
            messageID: eventData.post.id,
          },
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        adminInAppPayload,
        adminInAppReceiverIDs
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
      const inAppPayload: InAppNotificationSpaceCollaborationWhiteboardCreatedPayload =
        {
          type: NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_MEMBER,
          triggeredAt: new Date(),
          spaceID: space.id,
          calloutID: eventData.callout.id,
          whiteboardID: eventData.whiteboard.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
      );
    }
  }

  public async spaceCommunityNewMember(
    eventData: NotificationInputCommunityNewMember
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER;
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
      await this.notificationExternalAdapter.buildSpaceCommunityNewMemberPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        space,
        eventData.contributorID
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationSpaceCommunityNewMemberPayload = {
        type: NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER,
        triggeredByID: eventData.triggeredBy,
        category: NotificationEventCategory.SPACE_MEMBER,
        triggeredAt: new Date(),
        spaceID: space.id,
        contributorType: 'user', // Default value, could be derived from eventData if available
        newMemberID: eventData.contributorID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
      );
    }

    // ALSO send admin notifications
    const adminEvent = NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN;
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
      const adminInAppPayload: InAppNotificationSpaceCommunityNewMemberAdminPayload =
        {
          type: NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_ADMIN,
          triggeredAt: new Date(),
          spaceID: space.id,
          contributorType: 'user',
          newMemberID: eventData.contributorID,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        adminInAppPayload,
        adminInAppReceiverIDs
      );
    }
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
      const inAppPayload: InAppNotificationSpaceCommunityApplicationApplicantPayload =
        {
          type: NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_MEMBER,
          triggeredAt: new Date(),
          spaceID: space.id,
          applicationID: 'unknown',
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
      const adminInAppPayload: InAppNotificationSpaceCommunityApplicationAdminPayload =
        {
          type: NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_ADMIN,
          triggeredAt: new Date(),
          spaceID: space.id,
          applicationID: 'unknown',
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        adminInAppPayload,
        adminInAppReceiverIDs
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
      space.id
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
      const inAppPayload: InAppNotificationSpaceCommunityInvitationUserPayload =
        {
          type: NotificationEvent.SPACE_COMMUNITY_INVITATION_USER,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_MEMBER,
          triggeredAt: new Date(),
          spaceID: space.id,
          invitationID: eventData.invitationID,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
      const inAppPayload: InAppNotificationSpaceCommunicationMessageRecipientPayload =
        {
          type: NotificationEvent.SPACE_COMMUNICATION_MESSAGE_RECIPIENT,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_ADMIN,
          triggeredAt: new Date(),
          spaceID: space.id,
          message: {
            roomID: 'unknown',
            messageID: eventData.message,
          },
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
      const inAppPayload: InAppNotificationSpaceCollaborationPostCommentCreatedPayload =
        {
          type: NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_MEMBER,
          triggeredAt: new Date(),
          spaceID: space.id,
          postID: eventData.post.id,
          calloutID: 'unknown', // Would need to get from post or context
          message: {
            roomID: eventData.room.id,
            messageID: eventData.commentSent.id,
          },
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
      const inAppPayload: InAppNotificationSpaceCommunicationUpdatePayload = {
        type: NotificationEvent.SPACE_COMMUNICATION_UPDATE,
        triggeredByID: eventData.triggeredBy,
        category: NotificationEventCategory.SPACE_MEMBER,
        triggeredAt: new Date(),
        spaceID: space.id,
        updateID: eventData.updates.id,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
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
      const adminInAppPayload: InAppNotificationSpaceCommunicationUpdateAdminPayload =
        {
          type: NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.SPACE_ADMIN,
          triggeredAt: new Date(),
          spaceID: space.id,
          updateID: eventData.updates.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        adminInAppPayload,
        adminInAppReceiverIDs
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
    spaceID: string
  ): Promise<NotificationRecipientResult> {
    return this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      spaceID
    );
  }
}
