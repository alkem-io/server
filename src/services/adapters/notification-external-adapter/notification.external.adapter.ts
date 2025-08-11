import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { ICommunity } from '@domain/community/community';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Post } from '@domain/collaboration/post/post.entity';
import {
  BaseEventPayload,
  OrganizationMentionEventPayload,
  OrganizationMessageEventPayload,
  UserMessageEventPayload,
  ContributorPayload,
  PlatformForumDiscussionCommentEventPayload,
  PlatformForumDiscussionCreatedEventPayload,
  PlatformGlobalRoleChangeEventPayload,
  PlatformUserRegistrationEventPayload,
  PlatformUserRemovedEventPayload,
  RoleChangeType,
  SpaceBaseEventPayload,
  PlatformSpaceCreatedEventPayload,
  SpaceCommunityApplicationCreatedEventPayload,
  SpaceCommunityInvitationCreatedEventPayload,
  SpaceCommunityInvitationVirtualContributorCreatedEventPayload,
  SpaceCommunityPlatformInvitationCreatedEventPayload,
  SpaceCollaborationPostCreatedEventPayload,
  SpaceCollaborationWhiteboardCreatedEventPayload,
  SpaceCollaborationCalloutPublishedEventPayload,
  SpaceCollaborationPostCommentEventPayload,
  UserCommentReplyEventPayload,
  SpaceCommunityNewMemberPayload,
  SpaceCommunicationUpdateEventPayload,
  SpaceCommunicationLeadsMessageEventPayload,
  UserMentionEventPayload,
} from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Community } from '@domain/community/community/community.entity';
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
import { NotificationInputPostCreated } from '../notification-adapter/dto/space/notification.dto.input.post.created';
import { NotificationInputWhiteboardCreated } from '../notification-adapter/dto/space/notification.dto.input.whiteboard.created';
import { NotificationInputPostComment } from '../notification-adapter/dto/space/notification.dto.input.post.comment';
import { NotificationInputCommentReply } from '../notification-adapter/dto/space/notification.dto.input.comment.reply';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { NotificationEvent } from '@common/enums/notification.event';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';

@Injectable()
export class NotificationExternalAdapter {
  constructor(
    private contributorLookupService: ContributorLookupService,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>,
    private contributionResolverService: ContributionResolverService,
    private urlGeneratorService: UrlGeneratorService,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  public async sendExternalNotification(
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
  ): Promise<SpaceCommunityApplicationCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const applicantPayload =
      await this.getContributorPayloadOrFail(triggeredBy);
    const payload: SpaceCommunityApplicationCreatedEventPayload = {
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
  ): Promise<SpaceCommunityInvitationCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const inviteePayload =
      await this.getContributorPayloadOrFail(invitedUserID);
    const payload: SpaceCommunityInvitationCreatedEventPayload = {
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
  ): Promise<SpaceCommunityInvitationVirtualContributorCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );

    const hostPayload = await this.getContributorPayloadOrFail(accountHost.id);

    const virtualContributorPayload: ContributorPayload =
      await this.getContributorPayloadOrFail(virtualContributorID);
    const result: SpaceCommunityInvitationVirtualContributorCreatedEventPayload =
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
    recipients: IUser[],
    invitedUserEmail: string,
    space: ISpace,
    message?: string
  ): Promise<SpaceCommunityPlatformInvitationCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const payload: SpaceCommunityPlatformInvitationCreatedEventPayload = {
      invitees: [{ email: invitedUserEmail }],
      welcomeMessage: message,
      ...spacePayload,
    };

    return payload;
  }

  async buildSpaceCollaborationPostCreatedPayload(
    eventType: NotificationEvent,
    triggeredBy: string,
    recipients: IUser[],
    space: ISpace,
    eventData: NotificationInputPostCreated
  ): Promise<SpaceCollaborationPostCreatedEventPayload> {
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
    const payload: SpaceCollaborationPostCreatedEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: calloutURL,
      },
      post: {
        id: post.id,
        createdBy: await this.getContributorPayloadOrFail(post.createdBy),
        displayName: post.profile.displayName,
        nameID: post.nameID,
        url: postURL,
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
  ): Promise<SpaceCollaborationWhiteboardCreatedEventPayload> {
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
    const payload: SpaceCollaborationWhiteboardCreatedEventPayload = {
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
  ): Promise<SpaceCollaborationCalloutPublishedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const payload: SpaceCollaborationCalloutPublishedEventPayload = {
      callout: {
        id: callout.id,
        displayName: callout.framing.profile.displayName,
        description: callout.framing.profile.description ?? '',
        nameID: callout.nameID,
        url: calloutURL,
        type: 'deprecated',
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
  ): Promise<SpaceCollaborationPostCommentEventPayload> {
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
    const payload: SpaceCollaborationPostCommentEventPayload = {
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
  ): Promise<SpaceCommunityNewMemberPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const memberPayload = await this.getContributorPayloadOrFail(contributorID);
    const payload: SpaceCommunityNewMemberPayload = {
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
  ): Promise<SpaceCommunicationUpdateEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const payload: SpaceCommunicationUpdateEventPayload = {
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
  ): Promise<PlatformSpaceCreatedEventPayload> {
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
  ): Promise<PlatformGlobalRoleChangeEventPayload> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const userPayload = await this.getContributorPayloadOrFail(userID);
    const actorPayload = await this.getContributorPayloadOrFail(triggeredBy);
    const result: PlatformGlobalRoleChangeEventPayload = {
      user: userPayload,
      actor: actorPayload,
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
  ): Promise<PlatformUserRegistrationEventPayload> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const userPayload = await this.getContributorPayloadOrFail(userID);

    const result: PlatformUserRegistrationEventPayload = {
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
  ): Promise<PlatformUserRemovedEventPayload> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const result: PlatformUserRemovedEventPayload = {
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
  ): Promise<PlatformForumDiscussionCommentEventPayload> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const discussionURL =
      await this.urlGeneratorService.getForumDiscussionUrlPath(discussion.id);
    const payload: PlatformForumDiscussionCommentEventPayload = {
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
  ): Promise<PlatformForumDiscussionCreatedEventPayload> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const discussionURL =
      await this.urlGeneratorService.getForumDiscussionUrlPath(discussion.id);
    const payload: PlatformForumDiscussionCreatedEventPayload = {
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
  ): Promise<UserMessageEventPayload> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const receiverPayload = await this.getContributorPayloadOrFail(receiverID);
    const payload: UserMessageEventPayload = {
      user: receiverPayload,
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
  ): Promise<OrganizationMentionEventPayload | undefined> {
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
    const payload: OrganizationMentionEventPayload = {
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
  ): Promise<OrganizationMessageEventPayload> {
    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const orgContributor =
      await this.getContributorPayloadOrFail(organizationID);
    const payload: OrganizationMessageEventPayload = {
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
  ): Promise<SpaceCommunicationLeadsMessageEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      eventType,
      triggeredBy,
      recipients,
      space
    );
    const payload: SpaceCommunicationLeadsMessageEventPayload = {
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
  ): Promise<UserCommentReplyEventPayload> {
    const user = await this.getContributorPayloadOrFail(data.commentOwnerID);

    const commentOriginUrl = await this.buildCommentOriginUrl(
      data.commentType,
      data.originEntity.id
    );

    const basePayload = await this.buildBaseEventPayload(
      eventType,
      triggeredBy,
      recipients
    );
    const payload: UserCommentReplyEventPayload = {
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
  ): Promise<UserMentionEventPayload | undefined> {
    const userContributor =
      await this.getContributorPayloadOrFail(mentionedUserUUID);

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
    const payload: UserMentionEventPayload = {
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

  private async buildCommentOriginUrl(
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
  ): Promise<SpaceBaseEventPayload> {
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
    const result: SpaceBaseEventPayload = {
      space: {
        id: space.id,
        nameID: space.nameID,
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
    const contributor = await this.getContributorPayloadOrFail(triggeredBy);
    const result: BaseEventPayload = {
      eventType,
      triggeredBy: contributor,
      recipients: recipients.map(recipient =>
        this.createContributorPayloadFromContributor(recipient)
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

    const userURL =
      this.urlGeneratorService.createUrlForContributor(contributor);
    const result: ContributorPayload = {
      id: contributor.id,
      nameID: contributor.nameID,
      profile: {
        displayName: contributor.profile.displayName,
        url: userURL,
      },
      type: contributorType,
    };
    return result;
  }

  private createContributorPayloadFromContributor(
    user: IContributor
  ): ContributorPayload {
    return {
      id: user.id,
      nameID: user.nameID,
      profile: {
        displayName: user.profile.displayName,
        url: this.urlGeneratorService.createUrlForContributor(user),
      },
      type: RoleSetContributorType.USER,
    };
  }

  private async getCommunityOrFail(communityID: string): Promise<ICommunity> {
    const community = await this.communityRepository
      .createQueryBuilder('community')
      .where('community.id = :id')
      .setParameters({ id: communityID })
      .getOne();

    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community with id: ${communityID}`,
        LogContext.SPACES
      );
    }
    return community;
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
        nameID: '',
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
