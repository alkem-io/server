import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputPlatformUserRegistered } from './dto/platform/notification.dto.input.platform.user.registered';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { NotificationAdapter } from './notification.adapter';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { InAppNotificationPayloadUserMessageDirect } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.direct';
import { LogContext } from '@common/enums/logging.context';
import { InAppNotificationPayloadUserMessageRoom } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.room';
import { NotificationInputCommentReply } from './dto/space/notification.dto.input.space.communication.user.comment.reply';
import { NotificationInputUserMessage } from './dto/user/notification.dto.input.user.message';
import { NotificationInputUserMention } from './dto/user/notification.dto.input.user.mention';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationPayloadSpaceCommunityInvitation } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.invitation';
import { NotificationInputCommunityInvitation } from './dto/space/notification.dto.input.space.community.invitation';
import { NotificationInputCommunityNewMember } from './dto/space/notification.dto.input.space.community.new.member';
import { InAppNotificationPayloadSpaceCommunityContributor } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.contributor';
import { InAppNotificationPayloadSpace } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space';
import { NotificationInputUserSpaceCommunityApplicationDeclined } from './dto/user/notification.dto.input.user.space.community.application.declined';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { InAppNotificationPayloadUser } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user';

@Injectable()
export class NotificationUserAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationAdapter: NotificationAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private communityResolverService: CommunityResolverService,
    private messageDetailsService: MessageDetailsService
  ) {}

  public async userSignUpWelcome(
    eventData: NotificationInputPlatformUserRegistered
  ): Promise<void> {
    const event = NotificationEvent.USER_SIGN_UP_WELCOME;
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.userID
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
      const inAppPayload: InAppNotificationPayloadUser = {
        type: NotificationEventPayload.USER,
        userID: eventData.userID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.USER_SIGN_UP_WELCOME,
        NotificationEventCategory.PLATFORM,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async userSpaceCommunityInvitationCreated(
    eventData: NotificationInputCommunityInvitation
  ): Promise<void> {
    const event = NotificationEvent.USER_SPACE_COMMUNITY_INVITATION;

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.invitedContributorID
    );

    const payload =
      await this.notificationExternalAdapter.buildNotificationPayloadUserSpaceCommunityInvitation(
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
      const inAppPayload: InAppNotificationPayloadSpaceCommunityInvitation = {
        type: NotificationEventPayload.SPACE_COMMUNITY_INVITATION,
        invitationID: eventData.invitationID,
        spaceID: space.id,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.USER_SPACE_COMMUNITY_INVITATION,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async userSpaceCommunityJoined(
    eventData: NotificationInputCommunityNewMember,
    space: ISpace
  ): Promise<void> {
    const event = NotificationEvent.USER_SPACE_COMMUNITY_JOINED;

    // Will be one recipient i.e. the new member!
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.contributorID
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
      const inAppPayload: InAppNotificationPayloadSpaceCommunityContributor = {
        type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR,
        spaceID: space.id,
        contributorID: eventData.contributorID,
        contributorType: eventData.contributorType,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.USER_SPACE_COMMUNITY_JOINED,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async userMention(
    eventData: NotificationInputUserMention
  ): Promise<void> {
    const messageDetails = await this.messageDetailsService.getMessageDetails(
      eventData.roomID,
      eventData.messageID
    );

    const event = NotificationEvent.USER_MENTIONED;
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.userID
    );

    // Filter out the sender from email recipients (in case user mentions themselves)
    const emailRecipientsWithoutSender = recipients.emailRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );

    if (emailRecipientsWithoutSender.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildUserMentionNotificationPayload(
          event,
          eventData.triggeredBy,
          emailRecipientsWithoutSender,
          eventData.userID,
          messageDetails
        );

      this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // In-app notification
    const inAppRecipientsWithoutSender = recipients.inAppRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    const inAppReceiverIDs = inAppRecipientsWithoutSender.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload = await this.buildUserMentionInAppPayload(eventData);

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.USER_MENTIONED,
        NotificationEventCategory.USER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async userToUserMessageDirect(
    eventData: NotificationInputUserMessage
  ): Promise<void> {
    const event = NotificationEvent.USER_MESSAGE;
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.receiverID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildUserMessageSentNotificationPayload(
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
        NotificationEvent.USER_MESSAGE,
        NotificationEventCategory.USER,
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
    const messageDetails = await this.messageDetailsService.getMessageDetails(
      eventData.roomId,
      eventData.messageID
    );
    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.messageRepliedToOwnerID
    );

    try {
      // Filter out the sender from email recipients
      const emailRecipientsWithoutSender = recipients.emailRecipients.filter(
        recipient => recipient.id !== eventData.triggeredBy
      );
      if (emailRecipientsWithoutSender.length > 0) {
        const payload =
          await this.notificationExternalAdapter.buildUserCommentReplyPayload(
            event,
            eventData.triggeredBy,
            emailRecipientsWithoutSender,
            eventData,
            messageDetails
          );

        this.notificationExternalAdapter.sendExternalNotifications(
          event,
          payload
        );
      }

      // In-app notification
      const inAppRecipientsWithoutSender = recipients.inAppRecipients.filter(
        recipient => recipient.id !== eventData.triggeredBy
      );
      const inAppReceiverIDs = inAppRecipientsWithoutSender.map(
        recipient => recipient.id
      );
      if (inAppReceiverIDs.length > 0) {
        const inAppPayload: InAppNotificationPayloadUserMessageRoom = {
          type: NotificationEventPayload.USER_MESSAGE_ROOM,
          userID: eventData.messageRepliedToOwnerID,
          roomID: eventData.roomId,
          messageID: eventData.messageID,
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

  public async userSpaceCommunityApplicationDeclined(
    eventData: NotificationInputUserSpaceCommunityApplicationDeclined,
    space: ISpace
  ): Promise<void> {
    const event = NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED;

    const recipients = await this.getNotificationRecipientsUser(
      event,
      eventData,
      eventData.userID
    );

    if (recipients.emailRecipients.length > 0) {
      const payload =
        await this.notificationExternalAdapter.buildUserSpaceCommunityApplicationDeclinedPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
          eventData.userID,
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
      const inAppPayload: InAppNotificationPayloadSpace = {
        type: NotificationEventPayload.SPACE,
        spaceID: eventData.spaceID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED,
        NotificationEventCategory.SPACE_MEMBER,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  private async buildUserMentionInAppPayload(
    eventData: NotificationInputUserMention
  ): Promise<InAppNotificationPayloadUserMessageRoom> {
    return {
      type: NotificationEventPayload.USER_MESSAGE_ROOM,
      userID: eventData.userID,
      roomID: eventData.roomID,
      messageID: eventData.messageID,
    };
  }

  private async getNotificationRecipientsUser(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    userID?: string
  ): Promise<NotificationRecipientResult> {
    return this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      undefined,
      userID
    );
  }
}
