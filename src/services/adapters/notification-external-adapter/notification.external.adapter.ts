import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Post } from '@domain/collaboration/post/post.entity';
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
import { RoomType } from '@common/enums/room.type';
import { IRoom } from '@domain/communication/room/room.interface';
import { ContributionResolverService } from '@services/infrastructure/entity-resolver/contribution.resolver.service';
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
import { NotificationInputPostCreated } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.post.created';
import { NotificationInputWhiteboardCreated } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.whiteboard.created';
import { NotificationInputPostComment } from '../notification-adapter/dto/space/notification.dto.input.space.collaboration.post.comment';
import { NotificationInputCommentReply } from '../notification-adapter/dto/space/notification.dto.input.space.communication.user.comment.reply';

@Injectable()
export class NotificationExternalAdapter {
  constructor(
    private contributorLookupService: ContributorLookupService,
    private userLookupService: UserLookupService,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>,
    private contributionResolverService: ContributionResolverService,
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

  async buildSpaceCommunityInvitationCreatedNotificationPayload(
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
      invitee: {
        email: invitedUserEmail,
      },
    };

    return payload;
  }

  async buildSpaceCollaborationPostCreatedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputPostCreated
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const callout = eventData.callout;
    const post = eventData.post;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const postURL = await this.urlGeneratorService.getPostUrlPath(post.id);
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
        contribution: {
          id: post.id,
          createdBy: await this.getContributorPayloadOrFail(post.createdBy),
          displayName: post.profile.displayName,
          url: postURL,
        },
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCollaborationWhiteboardCreatedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputWhiteboardCreated
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const callout = eventData.callout;
    const whiteboard = eventData.whiteboard;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const whiteboardURL = await this.urlGeneratorService.getWhiteboardUrlPath(
      whiteboard.id,
      whiteboard.nameID
    );
    const whiteboardCreator = await this.getContributorPayloadOrEmpty(
      whiteboard.createdBy
    );
    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: calloutURL,
      },
      whiteboard: {
        id: eventData.whiteboard.id,
        createdBy: whiteboardCreator,
        displayName: whiteboard.profile.displayName,
        nameID: whiteboard.nameID,
        url: whiteboardURL,
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
        displayName: callout.framing.profile.displayName,
        description: callout.framing.profile.description ?? '',
        nameID: callout.nameID,
        url: calloutURL,
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCollaborationCommentCreatedOnPostPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputPostComment
  ): Promise<NotificationEventPayloadSpaceCollaborationCallout> {
    const post = eventData.post;
    const callout =
      await this.contributionResolverService.getCalloutForPostContribution(
        post.id
      );

    const messageResult = eventData.commentSent;

    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const postURL = await this.urlGeneratorService.getPostUrlPath(post.id);
    const payload: NotificationEventPayloadSpaceCollaborationCallout = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: calloutURL,
      },
      post: {
        displayName: post.profile.displayName,
        createdBy: await this.getContributorPayloadOrFail(post.createdBy),
        nameID: post.nameID,
        url: postURL,
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
      discussion: {
        id: discussion.id,
        createdBy: await this.getContributorPayloadOrFail(discussion.createdBy),
        displayName: discussion.profile.displayName,
        url: discussionURL,
      },
      ...basePayload,
    };

    return payload;
  }

  async buildUserMessageNotificationPayload(
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
    mentionedOrgUUID: string,
    comment: string,
    originEntityId: string,
    originEntityDisplayName: string,
    commentType: RoomType
  ): Promise<NotificationEventPayloadOrganizationMessageRoom> {
    const orgData = await this.getContributorPayloadOrFail(mentionedOrgUUID);

    const commentOriginUrl = await this.buildCommentOriginUrl(
      commentType,
      originEntityId
    );

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const payload: NotificationEventPayloadOrganizationMessageRoom = {
      organization: orgData,
      comment,
      commentOrigin: {
        url: commentOriginUrl,
        displayName: originEntityDisplayName,
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

  async buildSpaceCommunicationLeadsMessageNotificationPayload(
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
    data: NotificationInputCommentReply
  ): Promise<NotificationEventPayloadUserMessageRoomReply> {
    const user = await this.getUserPayloadOrFail(data.commentOwnerID);

    const commentOriginUrl = await this.buildCommentOriginUrl(
      data.commentType,
      data.originEntity.id
    );

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const payload: NotificationEventPayloadUserMessageRoomReply = {
      user,
      reply: data.reply,
      comment: {
        commentUrl: commentOriginUrl,
        commentOrigin: data.originEntity.displayName,
        commentOwnerId: user.id,
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
    comment: string,
    originEntityId: string,
    originEntityDisplayName: string,
    commentType: RoomType
  ): Promise<NotificationEventPayloadUserMessageRoom> {
    const userContributor = await this.getUserPayloadOrFail(mentionedUserUUID);

    const commentOriginUrl = await this.buildCommentOriginUrl(
      commentType,
      originEntityId
    );

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    //const userURL = await this.urlGeneratorService.
    const payload: NotificationEventPayloadUserMessageRoom = {
      user: userContributor,
      comment,
      commentOrigin: {
        url: commentOriginUrl,
        displayName: originEntityDisplayName,
      },
      ...basePayload,
    };

    return payload;
  }

  public async buildCommentOriginUrl(
    commentType: RoomType,
    originEntityId: string
  ): Promise<string> {
    if (commentType === RoomType.CALLOUT) {
      return await this.urlGeneratorService.getCalloutUrlPath(originEntityId);
    }

    if (commentType === RoomType.POST) {
      const post = await this.postRepository.findOne({
        where: {
          id: originEntityId,
        },
      });

      if (!post) {
        throw new NotificationEventException(
          `Could not acquire post with id: ${originEntityId}`,
          LogContext.NOTIFICATIONS
        );
      }

      return await this.urlGeneratorService.getPostUrlPath(post.id);
    }

    if (commentType === RoomType.CALENDAR_EVENT) {
      return await this.urlGeneratorService.getCalendarEventUrlPath(
        originEntityId
      );
    }

    if (commentType === RoomType.DISCUSSION_FORUM) {
      return await this.urlGeneratorService.getForumDiscussionUrlPath(
        originEntityId
      );
    }

    throw new NotificationEventException(
      `Comment of type: ${commentType} does not exist.`,
      LogContext.NOTIFICATIONS
    );
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
