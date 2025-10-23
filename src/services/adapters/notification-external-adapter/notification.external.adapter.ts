import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  BaseEventPayload,
  ContributorPayload,
  NotificationEventPayloadOrganizationMessageDirect,
  NotificationEventPayloadOrganizationMessageRoom,
  NotificationEventPayloadPlatformForumDiscussion,
  NotificationEventPayloadPlatformGlobalRole,
  NotificationEventPayloadPlatformSpaceCreated,
  NotificationEventPayloadPlatformUserRegistration,
  NotificationEventPayloadPlatformUserRemoved,
  NotificationEventPayloadSpace,
  NotificationEventPayloadSpaceCollaborationCallout,
  NotificationEventPayloadSpaceCommunicationMessageDirect,
  NotificationEventPayloadSpaceCommunicationUpdate,
  NotificationEventPayloadSpaceCommunityApplication,
  NotificationEventPayloadSpaceCommunityContributor,
  NotificationEventPayloadSpaceCommunityInvitation,
  NotificationEventPayloadSpaceCommunityInvitationPlatform,
  NotificationEventPayloadSpaceCommunityInvitationVirtualContributor,
  NotificationEventPayloadUserMessageDirect,
  NotificationEventPayloadUserMessageRoom,
  NotificationEventPayloadUserMessageRoomReply,
  RoleChangeType,
} from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { IUser } from '@domain/community/user/user.interface';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { AlkemioConfig } from '@src/types';
import { ClientProxy } from '@nestjs/microservices';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { NotificationEvent } from '@common/enums/notification.event';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';
import { UserPayload } from '@alkemio/notifications-lib/dist/dto/user.payload';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { NotificationInputCommentReply } from '../notification-adapter/dto/space/notification.dto.input.space.communication.user.comment.reply';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { NotificationInputCollaborationCalloutContributionCreated } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.contribution.created';
import { NotificationInputCollaborationCalloutComment } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.comment';
import { NotificationInputCollaborationCalloutPostContributionComment } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.post.contribution.comment';
import { MessageDetails } from '@domain/communication/message.details/message.details.interface';

interface CalloutContributionPayload {
  id: string;
  displayName: string;
  description: string;
  createdBy: ContributorPayload;
  type: CalloutContributionType;
  url: string;
}

@Injectable()
export class NotificationExternalAdapter {
  constructor(
    private contributorLookupService: ContributorLookupService,
    private userLookupService: UserLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>,
    private urlGeneratorService: UrlGeneratorService,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  public async sendExternalNotifications(
    event: NotificationEvent,
    payload: any
  ): Promise<void> {
    this.notificationsClient.emit<number>(event, payload);
  }

  async buildSpaceCommunityApplicationCreatedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace
  ): Promise<NotificationEventPayloadSpaceCommunityApplication> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const applicantPayload =
      await this.getContributorPayloadOrFail(triggeredBy);
    const payload: NotificationEventPayloadSpaceCommunityApplication = {
      applicant: applicantPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildNotificationPayloadUserSpaceCommunityInvitation(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    invitedUserID: string,
    space: ISpace,
    welcomeMessage?: string
  ): Promise<NotificationEventPayloadSpaceCommunityInvitation> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const inviteePayload =
      await this.getContributorPayloadOrFail(invitedUserID);
    const payload: NotificationEventPayloadSpaceCommunityInvitation = {
      invitee: inviteePayload,
      welcomeMessage,
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCommunityInvitationVirtualContributorCreatedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    virtualContributorID: string,
    accountHost: IContributor,
    space: ISpace,
    welcomeMessage?: string
  ): Promise<NotificationEventPayloadSpaceCommunityInvitationVirtualContributor> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );

    const hostPayload = await this.getContributorPayloadOrFail(accountHost.id);

    const virtualContributorPayload: ContributorPayload =
      await this.getContributorPayloadOrFail(virtualContributorID);
    const result: NotificationEventPayloadSpaceCommunityInvitationVirtualContributor =
      {
        host: hostPayload,
        invitee: virtualContributorPayload,
        welcomeMessage,
        ...spacePayload,
      };
    return result;
  }

  async buildSpaceCommunityExternalInvitationCreatedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    invitedUserEmail: string,
    space: ISpace,
    message?: string
  ): Promise<NotificationEventPayloadSpaceCommunityInvitationPlatform> {
    const recipients: UserPayload[] = [
      {
        email: invitedUserEmail,
        firstName: '',
        lastName: '',
        id: '',
        type: RoleSetContributorType.USER,
        profile: {
          url: '',
          displayName: '',
        },
      },
    ];
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      [],
      space
    );
    const payload: NotificationEventPayloadSpaceCommunityInvitationPlatform = {
      recipients,
      welcomeMessage: message,
      space: spacePayload.space,
      triggeredBy: spacePayload.triggeredBy,
      eventType,
      platform: spacePayload.platform,
    };

    return payload;
  }

  async buildSpaceCollaborationCreatedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputCollaborationCalloutContributionCreated
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const callout = eventData.callout;
    const contribution = eventData.contribution;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );

    // Determine the contribution type and generate appropriate URL and payload
    let contributionPayload: CalloutContributionPayload;

    if (contribution.post) {
      const postURL = await this.urlGeneratorService.getPostUrlPath(
        contribution.post.id
      );
      contributionPayload = {
        id: contribution.post.id,
        type: CalloutContributionType.POST,
        createdBy: await this.getContributorPayloadOrFail(
          contribution.createdBy || contribution.post.createdBy
        ),
        displayName: contribution.post.profile.displayName,
        description: contribution.post.profile.description ?? '',
        url: postURL,
      };
    } else if (contribution.whiteboard) {
      const whiteboardURL = await this.urlGeneratorService.getWhiteboardUrlPath(
        contribution.whiteboard.id,
        contribution.whiteboard.nameID
      );
      contributionPayload = {
        id: contribution.whiteboard.id,
        type: CalloutContributionType.WHITEBOARD,
        createdBy: await this.getContributorPayloadOrFail(
          contribution.createdBy || contribution.whiteboard.createdBy || ''
        ),
        displayName: contribution.whiteboard.profile.displayName,
        description: contribution.whiteboard.profile.description ?? '',
        url: whiteboardURL,
      };
    } else if (contribution.link) {
      contributionPayload = {
        id: contribution.link.id,
        type: CalloutContributionType.LINK,
        createdBy: await this.getContributorPayloadOrFail(
          contribution.createdBy || ''
        ),
        displayName: contribution.link.profile.displayName,
        description: contribution.link.profile.description ?? '',
        url: calloutURL, // no uri on link creation, use callout URL instead
      };
    } else {
      throw new RelationshipNotFoundException(
        'No valid contribution type found (post, whiteboard, or link)',
        LogContext.NOTIFICATIONS,
        {
          contribution: contribution.id,
          allowedTypes: callout.settings.contribution.allowedTypes,
        }
      );
    }

    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        id: callout.id,
        framing: {
          id: callout.framing.id,
          displayName: callout.framing.profile.displayName,
          url: calloutURL,
          description: callout.framing.profile.description ?? '',
          type: callout.framing.type,
        },
        contribution: contributionPayload,
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCollaborationCalloutCommentPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputCollaborationCalloutComment
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const callout = eventData.callout;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );

    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        id: callout.id,
        framing: {
          id: callout.framing.id,
          type: callout.framing.type,
          displayName: callout.framing.profile.displayName,
          description: callout.framing.profile.description ?? '',
          url: calloutURL,
        },
      },
      ...spacePayload,
    };

    return payload;
  }

  public async buildSpaceCollaborationCalloutPublishedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    callout: ICallout
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        id: callout.id,
        framing: {
          id: callout.framing.id,
          displayName: callout.framing.profile.displayName,
          description: callout.framing.profile.description ?? '',
          type: callout.framing.type,
          url: calloutURL,
        },
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCollaborationCalloutPostContributionCommentPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputCollaborationCalloutPostContributionComment
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const post = eventData.post;
    const callout = eventData.callout;

    const messageResult = eventData.commentSent;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      eventData.callout.id
    );
    const postURL = await this.urlGeneratorService.getPostUrlPath(post.id);
    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        id: callout.id,
        framing: {
          id: callout.framing.id,
          displayName: callout.framing.profile.displayName,
          description: callout.framing.profile.description ?? '',
          type: callout.framing.type,
          url: calloutURL,
        },
        contribution: {
          id: post.id,
          displayName: post.profile.displayName,
          description: post.profile.description ?? '',
          createdBy: await this.getContributorPayloadOrFail(post.createdBy),
          type: CalloutContributionType.POST,
          url: postURL,
        },
      },
      comment: {
        message: messageResult.message,
        createdBy: await this.getContributorPayloadOrFail(messageResult.sender),
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCommunityNewMemberPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    contributorID: string
  ): Promise<NotificationEventPayloadSpaceCommunityContributor> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const memberPayload = await this.getContributorPayloadOrFail(contributorID);
    const payload: NotificationEventPayloadSpaceCommunityContributor = {
      contributor: memberPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCommunicationUpdateSentNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    updates: IRoom,
    lastMessage?: IMessage
  ): Promise<NotificationEventPayloadSpaceCommunicationUpdate> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const payload: NotificationEventPayloadSpaceCommunicationUpdate = {
      update: {
        id: updates.id,
        createdBy: await this.getContributorPayloadOrFail(triggeredBy),
        url: 'not used',
      },
      message: lastMessage?.message,
      ...spacePayload,
    };

    return payload;
  }

  async buildPlatformSpaceCreatedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace
  ): Promise<NotificationEventPayloadPlatformSpaceCreated> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const sender = await this.getContributorPayloadOrFail(triggeredBy);

    return {
      sender: {
        name: sender.profile.displayName,
        url: sender.profile.url,
      },
      created: Date.now(),
      ...spacePayload,
    };
  }

  async buildUserSpaceCommunityApplicationDeclinedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    userID: string,
    space: ISpace
  ): Promise<NotificationEventPayloadSpaceCommunityApplication> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const applicantPayload = await this.getContributorPayloadOrFail(userID);
    const payload: NotificationEventPayloadSpaceCommunityApplication = {
      applicant: applicantPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildPlatformGlobalRoleChangedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    userID: string,
    type: RoleChangeType,
    role: string
  ): Promise<NotificationEventPayloadPlatformGlobalRole> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const userPayload = await this.getUserPayloadOrFail(userID);
    const result: NotificationEventPayloadPlatformGlobalRole = {
      user: userPayload,
      type,
      role,
      ...basePayload,
    };
    return result;
  }

  async buildPlatformUserRegisteredNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    userID: string
  ): Promise<NotificationEventPayloadPlatformUserRegistration> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const userPayload = await this.getUserPayloadOrFail(userID);

    const result: NotificationEventPayloadPlatformUserRegistration = {
      user: userPayload,
      ...basePayload,
    };
    return result;
  }

  public async buildPlatformUserRemovedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    user: IUser
  ): Promise<NotificationEventPayloadPlatformUserRemoved> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const result: NotificationEventPayloadPlatformUserRemoved = {
      user: {
        displayName: user.profile.displayName,
        email: user.email,
      },
      ...basePayload,
    };
    return result;
  }

  async buildPlatformForumCommentCreatedOnDiscussionPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    discussion: IDiscussion,
    message: IMessage
  ): Promise<NotificationEventPayloadPlatformForumDiscussion> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const discussionURL =
      await this.urlGeneratorService.getForumDiscussionUrlPath(discussion.id);
    const payload: NotificationEventPayloadPlatformForumDiscussion = {
      discussion: {
        id: discussion.id,
        displayName: discussion.profile.displayName,
        createdBy: await this.getContributorPayloadOrFail(discussion.createdBy),
        url: discussionURL,
      },
      comment: {
        message: message.message,
        createdBy: await this.getContributorPayloadOrFail(message.sender),
        url: '',
      },
      ...basePayload,
    };

    return payload;
  }

  async buildPlatformForumDiscussionCreatedNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    discussion: IDiscussion
  ): Promise<NotificationEventPayloadPlatformForumDiscussion> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const discussionURL =
      await this.urlGeneratorService.getForumDiscussionUrlPath(discussion.id);
    const payload: NotificationEventPayloadPlatformForumDiscussion = {
      ...basePayload,
      discussion: {
        id: discussion.id,
        createdBy: await this.getContributorPayloadOrFail(discussion.createdBy),
        displayName: discussion.profile.displayName,
        url: discussionURL,
      },
    };

    return payload;
  }

  async buildUserMessageSentNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    receiverID: string,
    message: string
  ): Promise<NotificationEventPayloadUserMessageDirect> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const user = await this.getUserPayloadOrFail(receiverID);
    const payload: NotificationEventPayloadUserMessageDirect = {
      user,
      message,
      ...basePayload,
    };

    return payload;
  }

  async buildOrganizationMentionNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    organizationID: string,
    messageDetails: MessageDetails
  ): Promise<NotificationEventPayloadOrganizationMessageRoom> {
    const orgData = await this.getContributorPayloadOrFail(organizationID);

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const payload: NotificationEventPayloadOrganizationMessageRoom = {
      organization: orgData,
      comment: messageDetails.message,
      commentOrigin: {
        url: messageDetails.parent.url,
        displayName: messageDetails.parent.displayName,
      },
      ...basePayload,
    };

    return payload;
  }

  async buildOrganizationMessageNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    message: string,
    organizationID: string
  ): Promise<NotificationEventPayloadOrganizationMessageDirect> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const orgContributor =
      await this.getContributorPayloadOrFail(organizationID);
    const payload: NotificationEventPayloadOrganizationMessageDirect = {
      message,
      organization: orgContributor,
      ...basePayload,
    };

    return payload;
  }

  async buildSpaceCommunicationMessageDirectNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    message: string
  ): Promise<NotificationEventPayloadSpaceCommunicationMessageDirect> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const payload: NotificationEventPayloadSpaceCommunicationMessageDirect = {
      message,
      ...spacePayload,
    };

    return payload;
  }

  async buildUserCommentReplyPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    data: NotificationInputCommentReply,
    messageDetails: MessageDetails
  ): Promise<NotificationEventPayloadUserMessageRoomReply> {
    const user = await this.getUserPayloadOrFail(data.messageRepliedToOwnerID);

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const payload: NotificationEventPayloadUserMessageRoomReply = {
      user,
      reply: messageDetails.message,
      comment: {
        commentUrl: messageDetails.parent.url,
        commentOrigin: messageDetails.parent.displayName,
        commentOwnerId: data.messageRepliedToOwnerID,
      },
      ...basePayload,
    };

    return payload;
  }

  async buildUserMentionNotificationPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    mentionedUserUUID: string,
    messageDetails: MessageDetails
  ): Promise<NotificationEventPayloadUserMessageRoom> {
    const userContributor = await this.getUserPayloadOrFail(mentionedUserUUID);

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    //const userURL = await this.urlGeneratorService.
    const payload: NotificationEventPayloadUserMessageRoom = {
      user: userContributor,
      comment: messageDetails.message,
      commentOrigin: {
        url: messageDetails.parent.url,
        displayName: messageDetails.parent.displayName,
      },
      ...basePayload,
    };

    return payload;
  }

  private async buildSpacePayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace
  ): Promise<NotificationEventPayloadSpace> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );

    const url = await this.urlGeneratorService.generateUrlForProfile(
      space.about.profile
    );
    const spaceCommunityAdminUrl =
      await this.urlGeneratorService.createSpaceAdminCommunityURL(space.id);
    const result: NotificationEventPayloadSpace = {
      space: {
        id: space.id,
        level: space.level.toString(),
        profile: {
          displayName: space.about.profile.displayName,
          url: url,
        },
        adminURL: spaceCommunityAdminUrl,
      },
      ...basePayload,
    };

    return result;
  }

  private async buildBaseEventPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[]
  ): Promise<BaseEventPayload> {
    const contributor = await this.getUserPayloadOrFail(triggeredBy);
    const result: BaseEventPayload = {
      eventType,
      triggeredBy: contributor,
      recipients: recipients.map(recipient =>
        this.createUserPayloadFromUser(recipient)
      ),
      platform: {
        url: this.getPlatformURL(),
      },
    };

    return result;
  }

  private async getContributorPayloadOrFail(
    contributorID: string
  ): Promise<ContributorPayload> {
    const contributor =
      await this.contributorLookupService.getContributorByUUID(contributorID, {
        relations: {
          profile: true,
        },
      });

    if (!contributor || !contributor.profile) {
      throw new EntityNotFoundException(
        `Unable to find Contributor with profile for id: ${contributorID}`,
        LogContext.COMMUNITY
      );
    }

    const contributorType =
      this.contributorLookupService.getContributorType(contributor);

    const contributorURL =
      this.urlGeneratorService.createUrlForContributor(contributor);
    const result: ContributorPayload = {
      id: contributor.id,
      profile: {
        displayName: contributor.profile.displayName,
        url: contributorURL,
      },
      type: contributorType,
    };
    return result;
  }

  private async getUserPayloadOrFail(userID: string): Promise<UserPayload> {
    const user = await this.userLookupService.getUserOrFail(userID, {
      relations: {
        profile: true,
      },
    });

    const userURL = this.urlGeneratorService.createUrlForUserNameID(
      user.nameID
    );
    const result: UserPayload = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profile: {
        displayName: user.profile.displayName,
        url: userURL,
      },
      type: RoleSetContributorType.USER,
    };
    return result;
  }

  private createUserPayloadFromUser(user: IUser): UserPayload {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profile: {
        displayName: user.profile.displayName,
        url: this.urlGeneratorService.createUrlForUserNameID(user.nameID),
      },
      type: RoleSetContributorType.USER,
    };
  }

  private createContributorPayloadFromContributor(
    contributor: IContributor
  ): ContributorPayload {
    return {
      id: contributor.id,
      profile: {
        displayName: contributor.profile.displayName,
        url: this.urlGeneratorService.createUrlForContributor(contributor),
      },
      type: RoleSetContributorType.USER,
    };
  }

  private getPlatformURL(): string {
    return this.configService.get('hosting.endpoint_cluster', { infer: true });
  }

  private async getContributorPayloadOrEmpty(
    contributorID: string | undefined
  ): Promise<ContributorPayload> {
    if (!contributorID) {
      return {
        id: '',
        profile: {
          displayName: '',
          url: '',
        },
        type: RoleSetContributorType.USER,
      };
    }

    return await this.getContributorPayloadOrFail(contributorID);
  }
}
