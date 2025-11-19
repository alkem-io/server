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
import { NotificationInputCollaborationCalloutContributionCreated } from './dto/space/notification.dto.input.space.collaboration.callout.contribution.created';
import { NotificationInputCollaborationCalloutComment } from './dto/space/notification.dto.input.space.collaboration.callout.comment';
import { NotificationInputCollaborationCalloutPostContributionComment } from './dto/space/notification.dto.input.space.collaboration.callout.post.contribution.comment';
import { InAppNotificationPayloadSpaceCollaborationCalloutPostComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout.post.comment';
import { InAppNotificationPayloadSpaceCollaborationCalloutComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout.comment';
import { NotificationInputVirtualContributorSpaceCommunityInvitationDeclined } from './dto/space/notification.dto.input.space.community.invitation.vc.declined';
import { NotificationInputCommunityCalendarEventCreated } from './dto/space/notification.dto.input.space.community.calendar.event.created';
import { InAppNotificationPayloadSpaceCommunityCalendarEvent } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event';
import { NotificationInputCommunityCalendarEventComment } from './dto/space/notification.dto.input.space.community.calendar.event.comment';
import { InAppNotificationPayloadSpaceCommunityCalendarEventComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event.comment';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';

@Injectable()
export class NotificationSpaceAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private notificationAdapter: NotificationAdapter,
    private notificationUserAdapter: NotificationUserAdapter,
    private communityResolverService: CommunityResolverService,
    private spaceLookupService: SpaceLookupService
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

  public async spaceCommunityCalendarEventCreated(
    eventData: NotificationInputCommunityCalendarEventCreated,
    spaceID: string
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED;

    const space = await this.spaceLookupService.getSpaceOrFail(spaceID, {
      relations: {
        about: {
          profile: true,
        },
      },
    });

    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id
    );

    // Exclude the creator from both email and in-app recipients
    const creatorID = eventData.calendarEvent.createdBy;
    const emailRecipientsExcludingCreator = recipients.emailRecipients.filter(
      recipient => recipient.id !== creatorID
    );
    const inAppRecipientsExcludingCreator = recipients.inAppRecipients.filter(
      recipient => recipient.id !== creatorID
    );

    // Send email notifications
    if (emailRecipientsExcludingCreator.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildSpaceCommunityCalendarEventCreatedPayload(
          event,
          eventData.triggeredBy,
          emailRecipientsExcludingCreator,
          space,
          eventData.calendarEvent
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // Send in-app notifications
    const inAppReceiverIDs = inAppRecipientsExcludingCreator.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCommunityCalendarEvent =
        {
          type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT,
          spaceID: space.id,
          calendarEventID: eventData.calendarEvent.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCommunityCalendarEventComment(
    eventData: NotificationInputCommunityCalendarEventComment,
    spaceID: string
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT;

    const space = await this.spaceLookupService.getSpaceOrFail(spaceID, {
      relations: {
        about: {
          profile: true,
        },
      },
    });

    // Get the calendar event creator's user ID
    const creatorID = eventData.calendarEvent.createdBy;
    const commenterID = eventData.triggeredBy;

    // Only notify the creator if they are not the commenter
    if (creatorID === commenterID) {
      return;
    }

    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id,
      creatorID // Pass the creator's user ID
    );

    // Send email notifications
    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildSpaceCommunityCalendarEventCommentPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          space,
          eventData.calendarEvent,
          eventData.commentSent
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
      const commentPreview = eventData.commentSent.message.substring(0, 200);
      const inAppPayload: InAppNotificationPayloadSpaceCommunityCalendarEventComment =
        {
          type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT,
          spaceID: space.id,
          calendarEventID: eventData.calendarEvent.id,
          commentText: commentPreview,
          roomID: eventData.comments.id,
          messageID: eventData.commentSent.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCollaborationCalloutContributionCreated(
    eventData: NotificationInputCollaborationCalloutContributionCreated
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
      await this.notificationExternalAdapter.buildSpaceCollaborationCreatedPayload(
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
      await this.notificationExternalAdapter.buildSpaceCollaborationCreatedPayload(
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

  public async spaceCollaborationCalloutPostContributionComment(
    eventData: NotificationInputCollaborationCalloutPostContributionComment
  ): Promise<void> {
    const event =
      NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT;

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        eventData.callout.id
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

    // Filter out the sender
    const recipientsWithoutSender = recipients.emailRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    // ALSO only send to the creator of the post
    const recipientCreator = recipientsWithoutSender.filter(
      recipient => recipient.id === eventData.post.createdBy
    );
    // build notification payload
    if (recipientCreator.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildSpaceCollaborationCalloutPostContributionCommentPayload(
          event,
          eventData.triggeredBy,
          recipientCreator,
          space,
          eventData
        );
      // send notification event
      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // Send in-app notifications
    // get the creator but only if it not the sender
    const inAppReceiverCreators = recipients.inAppRecipients
      .filter(
        r => r.id === eventData.post.createdBy && r.id !== eventData.triggeredBy
      )
      .map(r => r.id);

    if (inAppReceiverCreators.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationCalloutPostComment =
        {
          type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_POST_COMMENT,
          spaceID: space.id,
          contributionID: eventData.contribution.id,
          calloutID: eventData.callout.id,
          messageID: eventData.commentSent.id,
          roomID: eventData.room.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverCreators,
        inAppPayload
      );
    }
  }

  public async spaceCollaborationCalloutComment(
    eventData: NotificationInputCollaborationCalloutComment
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT;

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        eventData.callout.id
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
    const emailRecipientsWithoutSender = recipients.emailRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    const payload =
      await this.notificationExternalAdapter.buildSpaceCollaborationCalloutCommentPayload(
        event,
        eventData.triggeredBy,
        emailRecipientsWithoutSender,
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
      const inAppPayload: InAppNotificationPayloadSpaceCollaborationCalloutComment =
        {
          type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_COMMENT,
          spaceID: space.id,
          calloutID: eventData.callout.id,
          messageID: eventData.commentSent.id,
          contributionID: eventData.triggeredBy,
          roomID: eventData.comments?.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT,
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
          contributorType: eventData.contributorType,
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

  public async spaceAdminVirtualContributorInvitationDeclined(
    eventData: NotificationInputVirtualContributorSpaceCommunityInvitationDeclined,
    space: any
  ): Promise<void> {
    const event =
      NotificationEvent.SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED;

    const recipients = await this.getNotificationRecipientsSpace(
      event,
      eventData,
      space.id,
      eventData.invitationCreatedBy
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
      const inAppPayload: InAppNotificationPayloadSpaceCommunityContributor = {
        type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR,
        spaceID: space.id,
        contributorID: eventData.virtualContributorID,
        contributorType: RoleSetContributorType.VIRTUAL,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
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
          applicationID: eventData.application.id,
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

  public async spaceCommunicationMessage(
    eventData: NotificationInputCommunicationLeadsMessage
  ): Promise<void> {
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.communityID
      );

    // Recipient
    const eventRecipientsAdmins =
      NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE;

    const recipients = await this.getNotificationRecipientsSpace(
      eventRecipientsAdmins,
      eventData,
      space.id
    );
    if (recipients.emailRecipients.length > 0) {
      // Emit the events to notify others
      const payloadRecipients =
        await this.notificationExternalAdapter.buildSpaceCommunicationMessageDirectNotificationPayload(
          eventRecipientsAdmins,
          eventData.triggeredBy,
          recipients.emailRecipients,
          space,
          eventData.message
        );
      this.notificationExternalAdapter.sendExternalNotifications(
        eventRecipientsAdmins,
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
        NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE,
        NotificationEventCategory.SPACE_ADMIN,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async spaceCommunicationUpdate(
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

    const memberEmailRecipientsWithoutAdmins = this.excludeDuplicatedRecipients(
      memberRecipients.triggeredBy ? [memberRecipients.triggeredBy] : [],
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
    const memberInAppRecipientsWithoutAdmins = this.excludeDuplicatedRecipients(
      memberRecipients.triggeredBy ? [memberRecipients.triggeredBy] : [],
      memberRecipients.inAppRecipients
    );
    const inAppReceiverIDs = memberInAppRecipientsWithoutAdmins.map(
      recipient => recipient.id
    );

    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpaceCommunicationUpdate = {
        type: NotificationEventPayload.SPACE_COMMUNICATION_UPDATE,
        spaceID: space.id,
        update: eventData.lastMessage.message,
        messageID: eventData.lastMessage.id,
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

  private excludeDuplicatedRecipients(
    recipientsToExclude: IUser[],
    allRecipients: IUser[]
  ): IUser[] {
    if (!recipientsToExclude || recipientsToExclude.length === 0) {
      return allRecipients;
    }

    return allRecipients.filter(
      rec => !recipientsToExclude.some(excludeRec => excludeRec.id === rec.id)
    );
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
