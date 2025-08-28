import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IUserSettings } from './user.settings.interface';
import { UpdateUserSettingsEntityInput } from './dto/user.settings.dto.update';
import { CreateUserSettingsInput } from './dto/user.settings.dto.create';
import { UserSettings } from './user.settings.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { FindOneOptions, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(UserSettings)
    private userSettingsRepository: Repository<UserSettings>
  ) {}

  public createUserSettings(
    settingsData: CreateUserSettingsInput
  ): IUserSettings {
    const settings = UserSettings.create({
      communication: settingsData.communication,
      privacy: settingsData.privacy,
      notification: settingsData.notification,
    });
    settings.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.USER_SETTINGS
    );
    return settings;
  }

  public updateSettings(
    settings: IUserSettings,
    updateData: UpdateUserSettingsEntityInput
  ): IUserSettings {
    if (updateData.privacy) {
      if (updateData.privacy.contributionRolesPubliclyVisible !== undefined) {
        settings.privacy.contributionRolesPubliclyVisible =
          updateData.privacy.contributionRolesPubliclyVisible;
      }
    }
    if (updateData.communication) {
      if (
        updateData.communication.allowOtherUsersToSendMessages !== undefined
      ) {
        settings.communication.allowOtherUsersToSendMessages =
          updateData.communication.allowOtherUsersToSendMessages;
      }
    }
    const notificationPlatformData = updateData.notification?.platform;
    if (notificationPlatformData) {
      // Handle regular platform notifications
      if (notificationPlatformData.forumDiscussionComment !== undefined) {
        settings.notification.platform.forumDiscussionComment.email =
          notificationPlatformData.forumDiscussionComment;
        settings.notification.platform.forumDiscussionComment.inApp =
          notificationPlatformData.forumDiscussionComment;
      }
      if (notificationPlatformData.forumDiscussionCreated !== undefined) {
        settings.notification.platform.forumDiscussionCreated.email =
          notificationPlatformData.forumDiscussionCreated;
        settings.notification.platform.forumDiscussionCreated.inApp =
          notificationPlatformData.forumDiscussionCreated;
      }

      // Handle admin platform notifications
      if (notificationPlatformData.admin) {
        const adminData = notificationPlatformData.admin;

        if (adminData.userProfileRemoved !== undefined) {
          settings.notification.platform.admin.userProfileRemoved.email =
            adminData.userProfileRemoved;
          settings.notification.platform.admin.userProfileRemoved.inApp =
            adminData.userProfileRemoved;
        }
        if (adminData.userProfileCreated !== undefined) {
          settings.notification.platform.admin.userProfileCreated.email =
            adminData.userProfileCreated;
          settings.notification.platform.admin.userProfileCreated.inApp =
            adminData.userProfileCreated;
        }
        if (adminData.spaceCreated !== undefined) {
          settings.notification.platform.admin.spaceCreated.email =
            adminData.spaceCreated;
          settings.notification.platform.admin.spaceCreated.inApp =
            adminData.spaceCreated;
        }
        if (adminData.userGlobalRoleChanged !== undefined) {
          settings.notification.platform.admin.userGlobalRoleChanged.email =
            adminData.userGlobalRoleChanged;
          settings.notification.platform.admin.userGlobalRoleChanged.inApp =
            adminData.userGlobalRoleChanged;
        }
      }
    }

    const notificationOrganizationData = updateData.notification?.organization;
    if (notificationOrganizationData) {
      if (notificationOrganizationData.adminMentioned !== undefined) {
        settings.notification.organization.adminMentioned.email =
          notificationOrganizationData.adminMentioned;
        settings.notification.organization.adminMentioned.inApp =
          notificationOrganizationData.adminMentioned;
      }
      if (notificationOrganizationData.adminMessageReceived !== undefined) {
        settings.notification.organization.adminMessageReceived.email =
          notificationOrganizationData.adminMessageReceived;
        settings.notification.organization.adminMessageReceived.inApp =
          notificationOrganizationData.adminMessageReceived;
      }
    }

    const notificationSpaceData = updateData.notification?.space;
    if (notificationSpaceData) {
      // Handle admin space notifications
      if (notificationSpaceData.admin) {
        const adminData = notificationSpaceData.admin;

        if (adminData.communityApplicationReceived !== undefined) {
          settings.notification.space.admin.communityApplicationReceived.email =
            adminData.communityApplicationReceived;
          settings.notification.space.admin.communityApplicationReceived.inApp =
            adminData.communityApplicationReceived;
        }
        if (adminData.communityNewMember !== undefined) {
          settings.notification.space.admin.communityNewMember.email =
            adminData.communityNewMember;
          settings.notification.space.admin.communityNewMember.inApp =
            adminData.communityNewMember;
        }
        if (adminData.communicationMessageReceived !== undefined) {
          settings.notification.space.admin.communicationMessageReceived.email =
            adminData.communicationMessageReceived;
          settings.notification.space.admin.communicationMessageReceived.inApp =
            adminData.communicationMessageReceived;
        }
        if (adminData.collaborationCalloutContributionCreated !== undefined) {
          settings.notification.space.admin.collaborationCalloutContributionCreated.email =
            adminData.collaborationCalloutContributionCreated;
          settings.notification.space.admin.collaborationCalloutContributionCreated.inApp =
            adminData.collaborationCalloutContributionCreated;
        }
      }

      // Handle regular space notifications
      if (notificationSpaceData.communicationUpdates !== undefined) {
        settings.notification.space.communicationUpdates.email =
          notificationSpaceData.communicationUpdates;
        settings.notification.space.communicationUpdates.inApp =
          notificationSpaceData.communicationUpdates;
      }
      if (
        notificationSpaceData.collaborationCalloutContributionCreated !==
        undefined
      ) {
        settings.notification.space.collaborationCalloutContributionCreated.email =
          notificationSpaceData.collaborationCalloutContributionCreated;
        settings.notification.space.collaborationCalloutContributionCreated.inApp =
          notificationSpaceData.collaborationCalloutContributionCreated;
      }
      if (
        notificationSpaceData.collaborationCalloutPostContributionComment !==
        undefined
      ) {
        settings.notification.space.collaborationCalloutPostContributionComment.email =
          notificationSpaceData.collaborationCalloutPostContributionComment;
        settings.notification.space.collaborationCalloutPostContributionComment.inApp =
          notificationSpaceData.collaborationCalloutPostContributionComment;
      }
      if (notificationSpaceData.collaborationCalloutComment !== undefined) {
        settings.notification.space.collaborationCalloutComment.email =
          notificationSpaceData.collaborationCalloutComment;
        settings.notification.space.collaborationCalloutComment.inApp =
          notificationSpaceData.collaborationCalloutComment;
      }
      if (notificationSpaceData.collaborationCalloutPublished !== undefined) {
        settings.notification.space.collaborationCalloutPublished.email =
          notificationSpaceData.collaborationCalloutPublished;
        settings.notification.space.collaborationCalloutPublished.inApp =
          notificationSpaceData.collaborationCalloutPublished;
      }
    }

    const notificationUserData = updateData.notification?.user;
    if (notificationUserData) {
      // Handle core user notifications
      if (notificationUserData.messageReceived !== undefined) {
        settings.notification.user.messageReceived.email =
          notificationUserData.messageReceived;
        settings.notification.user.messageReceived.inApp =
          notificationUserData.messageReceived;
      }
      if (notificationUserData.copyOfMessageSent !== undefined) {
        settings.notification.user.copyOfMessageSent.email =
          notificationUserData.copyOfMessageSent;
        settings.notification.user.copyOfMessageSent.inApp =
          notificationUserData.copyOfMessageSent;
      }
      if (notificationUserData.mentioned !== undefined) {
        settings.notification.user.mentioned.email =
          notificationUserData.mentioned;
        settings.notification.user.mentioned.inApp =
          notificationUserData.mentioned;
      }
      if (notificationUserData.commentReply !== undefined) {
        settings.notification.user.commentReply.email =
          notificationUserData.commentReply;
        settings.notification.user.commentReply.inApp =
          notificationUserData.commentReply;
      }

      // Handle membership notifications
      if (notificationUserData.membership) {
        const membershipData = notificationUserData.membership;

        if (membershipData.spaceCommunityApplicationSubmitted !== undefined) {
          settings.notification.user.membership.spaceCommunityApplicationSubmitted.email =
            membershipData.spaceCommunityApplicationSubmitted;
          settings.notification.user.membership.spaceCommunityApplicationSubmitted.inApp =
            membershipData.spaceCommunityApplicationSubmitted;
        }
        if (membershipData.spaceCommunityInvitationReceived !== undefined) {
          settings.notification.user.membership.spaceCommunityInvitationReceived.email =
            membershipData.spaceCommunityInvitationReceived;
          settings.notification.user.membership.spaceCommunityInvitationReceived.inApp =
            membershipData.spaceCommunityInvitationReceived;
        }
        if (membershipData.spaceCommunityJoined !== undefined) {
          settings.notification.user.membership.spaceCommunityJoined.email =
            membershipData.spaceCommunityJoined;
          settings.notification.user.membership.spaceCommunityJoined.inApp =
            membershipData.spaceCommunityJoined;
        }
      }
    }

    const notificationVcData = updateData.notification?.virtualContributor;
    if (notificationVcData) {
      if (notificationVcData.adminSpaceCommunityInvitation !== undefined) {
        settings.notification.virtualContributor.adminSpaceCommunityInvitation.email =
          notificationVcData.adminSpaceCommunityInvitation;
        settings.notification.virtualContributor.adminSpaceCommunityInvitation.inApp =
          notificationVcData.adminSpaceCommunityInvitation;
      }
    }

    return settings;
  }

  async deleteUserSettings(userSettingsID: string): Promise<IUserSettings> {
    const userSettings = await this.getUserSettingsOrFail(userSettingsID);
    await this.userSettingsRepository.remove(userSettings as UserSettings);
    return userSettings;
  }

  async getUserSettingsOrFail(
    userSettingsID: string,
    options?: FindOneOptions<UserSettings>
  ): Promise<IUserSettings | never> {
    const userSettings = await this.userSettingsRepository.findOne({
      where: { id: userSettingsID },
      ...options,
    });
    if (!userSettings) {
      throw new EntityNotFoundException(
        `Unable to find UserSettings with ID: ${userSettingsID}`,
        LogContext.COMMUNITY
      );
    }
    return userSettings;
  }
}
