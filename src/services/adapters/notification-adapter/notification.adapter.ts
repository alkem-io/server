import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { NotificationInputPlatformForumDiscussionCreated } from './dto/platform/notification.dto.input.platform.forum.discussion.created';
import { NotificationInputPlatformUserRegistered } from './dto/platform/notification.dto.input.platform.user.registered';
import { NotificationInputPlatformUserRemoved } from './dto/platform/notification.dto.input.platform.user.removed';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils';
import { NotificationInputUserMessage } from './dto/user/notification.dto.input.user.message';
import { NotificationInputOrganizationMessage } from './dto/organization/notification.input.organization.message';
import { NotificationInputEntityMentions } from './dto/user/notification.dto.input.entity.mentions';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { NotificationInputPlatformForumDiscussionComment } from './dto/platform/notification.dto.input.platform.forum.discussion.comment';
import { NotificationInputPlatformInvitation } from './dto/space/notification.dto.input.space.community.invitation.platform';
import { NotificationInputPlatformGlobalRoleChange } from './dto/platform/notification.dto.input.platform.global.role.change';
import { NotificationInputSpaceCreated } from './dto/platform/notification.dto.input.platform.space.created';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { InAppNotificationSpaceCollaborationCalloutPublishedPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.callout.published.payload';
import { InAppNotificationSpaceCommunityNewMemberPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.new.member.payload';
import { InAppNotificationSpaceCommunityApplicationApplicantPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.application.applicant.payload';
import { InAppNotificationSpaceCommunityInvitationUserPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.invitation.user.payload';
import { InAppNotificationSpaceCommunicationMessageRecipientPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.communication.message.recipient.payload';
import { InAppNotificationOrganizationMentionedPayload } from '../notification-in-app-adapter/dto/organization/notification.in.app.organization.mentioned.payload';
import { InAppNotificationPlatformForumDiscussionCreatedPayload } from '../notification-in-app-adapter/dto/platform/notification.in.app.platform.forum.discussion.created.payload';
import { InAppNotificationSpaceCollaborationWhiteboardCreatedPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.whiteboard.created.payload';
import { InAppNotificationSpaceCollaborationPostCommentCreatedPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.post.comment.created.payload';
import { InAppNotificationSpaceCommunicationUpdatePayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.communication.update.payload';
import { InAppNotificationOrganizationMessageRecipientPayload } from '../notification-in-app-adapter/dto/organization/notification.in.app.organization.message.recipient.payload';
import { InAppNotificationUserCommentReplyPayload } from '../notification-in-app-adapter/dto/user/notification.in.app.user.comment.reply.payload';
import { InAppNotificationUserMessageRecipientPayload } from '../notification-in-app-adapter/dto/user/notification.in.app.user.message.recipient.payload';
import { InAppNotificationUserMentionedPayload } from '../notification-in-app-adapter/dto/user/notification.in.app.user.mentioned.payload';
import { InAppNotificationSpaceCommunityNewMemberAdminPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.new.member.admin.payload';
import { InAppNotificationSpaceCommunityApplicationAdminPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.community.application.admin.payload';
import { InAppNotificationSpaceCommunicationUpdateAdminPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.communication.update.admin.payload';
import { InAppNotificationSpaceCollaborationPostCreatedAdminPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.post.created.admin.payload';
import { InAppNotificationSpaceCollaborationPostCreatedPayload } from '../notification-in-app-adapter/dto/space/notification.in.app.space.collaboration.post.created.payload';
import { InAppNotificationPlatformUserProfileCreatedAdminPayload } from '../notification-in-app-adapter/dto/platform/notification.in.app.platform.user.profile.created.admin.payload';
import { InAppNotificationPlatformUserProfileCreatedPayload } from '../notification-in-app-adapter/dto/platform/notification.in.app.platform.user.profile.created.payload';
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
import { NotificationInputCommentReply } from './dto/space/notification.dto.input.space.communication.user.comment.reply';
import { NotificationInputOrganizationMention } from './dto/organization/notification.dto.input.organization.mention';
import { NotificationInputUserMention } from './dto/user/notification.dto.input.user.mention';
import { NotificationInputCommunicationLeadsMessage } from './dto/space/notification.dto.input.space.communication.leads.message';
@Injectable()
export class NotificationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationsRecipientsService: NotificationRecipientsService,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private communityResolverService: CommunityResolverService
  ) {}

  public async spaceCollaborationCalloutPublished(
    eventData: NotificationInputCalloutPublished
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        eventData.callout.id
      );

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
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
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        eventData.callout.id
      );

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
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
    const adminRecipients = await this.getNotificationRecipients(
      adminEvent,
      eventData,
      eventData.callout.id
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
    const recipients = await this.getNotificationRecipients(
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
    const recipients = await this.getNotificationRecipients(
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
    const recipients = await this.getNotificationRecipients(
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
      eventData
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
      eventData
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
      eventData
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

  public async platformGlobalRoleChanged(
    eventData: NotificationInputPlatformGlobalRoleChange
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_GLOBAL_ROLE_CHANGE;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    const payload =
      await this.notificationExternalAdapter.buildPlatformGlobalRoleChangedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.userID,
        eventData.type,
        eventData.role
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  public async platformForumDiscussionCreated(
    eventData: NotificationInputPlatformForumDiscussionCreated
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildPlatformForumDiscussionCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.discussion
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPlatformForumDiscussionCreatedPayload =
        {
          type: NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.PLATFORM,
          triggeredAt: new Date(),
          discussionID: eventData.discussion.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
      );
    }
  }

  public async platformForumDiscussionComment(
    eventData: NotificationInputPlatformForumDiscussionComment
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    // build notification payload
    const payload =
      await this.notificationExternalAdapter.buildPlatformForumCommentCreatedOnDiscussionPayload(
        event,
        eventData.commentSent.sender,
        recipients.emailRecipients,
        eventData.discussion,
        eventData.commentSent
      );
    // send notification event
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  public async platformInvitationCreated(
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

  public async platformSpaceCreated(
    eventData: NotificationInputSpaceCreated
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_SPACE_CREATED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    const payload =
      await this.notificationExternalAdapter.buildPlatformSpaceCreatedPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.space
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  public async platformUserRegistered(
    eventData: NotificationInputPlatformUserRegistered
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_USER_PROFILE_CREATED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    const payload =
      await this.notificationExternalAdapter.buildPlatformUserRegisteredNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.userID
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPlatformUserProfileCreatedPayload = {
        type: NotificationEvent.PLATFORM_USER_PROFILE_CREATED,
        triggeredByID: eventData.triggeredBy,
        category: NotificationEventCategory.PLATFORM,
        triggeredAt: new Date(),
        userID: eventData.userID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
      );
    }

    // ALSO send admin notifications
    const adminEvent = NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN;
    const adminRecipients = await this.getNotificationRecipientsPlatform(
      adminEvent,
      eventData
    );

    const adminPayload =
      await this.notificationExternalAdapter.buildPlatformUserRegisteredNotificationPayload(
        adminEvent,
        eventData.triggeredBy,
        adminRecipients.emailRecipients,
        eventData.userID
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
      const adminInAppPayload: InAppNotificationPlatformUserProfileCreatedAdminPayload =
        {
          type: NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.PLATFORM,
          triggeredAt: new Date(),
          userID: eventData.userID,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        adminInAppPayload,
        adminInAppReceiverIDs
      );
    }
  }

  public async platformUserRemoved(
    eventData: NotificationInputPlatformUserRemoved
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_USER_PROFILE_REMOVED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    const payload =
      this.notificationExternalAdapter.buildPlatformUserRemovedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.user
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
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

  private async getNotificationRecipientsPlatform(
    event: NotificationEvent,
    eventData: NotificationInputBase
  ): Promise<NotificationRecipientResult> {
    return this.getNotificationRecipients(event, eventData);
  }

  private async getNotificationRecipientsUser(
    event: NotificationEvent,
    eventData: NotificationInputBase
  ): Promise<NotificationRecipientResult> {
    return this.getNotificationRecipients(event, eventData);
  }

  private async getNotificationRecipientsOrganization(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    organizationID: string
  ): Promise<NotificationRecipientResult> {
    return this.getNotificationRecipients(event, eventData, organizationID);
  }

  private async getNotificationRecipientsSpace(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    spaceID: string
  ): Promise<NotificationRecipientResult> {
    return this.getNotificationRecipients(event, eventData, spaceID);
  }

  private async getNotificationRecipients(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    entityID?: string
  ): Promise<NotificationRecipientResult> {
    this.logEventTriggered(eventData, event);

    const recipients = await this.notificationsRecipientsService.getRecipients({
      eventType: event,
      entityID,
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
