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
      if (notificationPlatformData.forumDiscussionComment !== undefined) {
        settings.notification.platform.forumDiscussionComment =
          notificationPlatformData.forumDiscussionComment;
      }
      if (notificationPlatformData.forumDiscussionCreated !== undefined) {
        settings.notification.platform.forumDiscussionCreated =
          notificationPlatformData.forumDiscussionCreated;
      }
      if (notificationPlatformData.adminUserProfileRemoved !== undefined) {
        settings.notification.platform.userProfileRemoved =
          notificationPlatformData.adminUserProfileRemoved;
      }
      if (notificationPlatformData.adminUserProfileCreated !== undefined) {
        settings.notification.platform.userProfileCreated =
          notificationPlatformData.adminUserProfileCreated;
      }
      if (notificationPlatformData.adminSpaceCreated !== undefined) {
        settings.notification.platform.spaceCreated =
          notificationPlatformData.adminSpaceCreated;
      }
    }

    const notificationOrganizationData = updateData.notification?.organization;
    if (notificationOrganizationData) {
      if (notificationOrganizationData.adminMentioned !== undefined) {
        settings.notification.organization.adminMentioned =
          notificationOrganizationData.adminMentioned;
      }
      if (notificationOrganizationData.adminMessageReceived !== undefined) {
        settings.notification.organization.adminMessageReceived =
          notificationOrganizationData.adminMessageReceived;
      }
    }

    const notificationSpaceData = updateData.notification?.space;
    if (notificationSpaceData) {
      if (
        notificationSpaceData.adminCommunityApplicationReceived !== undefined
      ) {
        settings.notification.space.adminCommunityApplicationReceived =
          notificationSpaceData.adminCommunityApplicationReceived;
      }
      if (notificationSpaceData.adminCommunityNewMember !== undefined) {
        settings.notification.space.adminCommunityNewMember =
          notificationSpaceData.adminCommunityNewMember;
      }
      if (notificationSpaceData.adminCommunicationMessage !== undefined) {
        settings.notification.space.adminCommunicationMessageReceived =
          notificationSpaceData.adminCommunicationMessage;
      }
      if (
        notificationSpaceData.adminCollaborationCalloutContribution !==
        undefined
      ) {
        settings.notification.space.adminCollaborationContributionCreated =
          notificationSpaceData.adminCollaborationCalloutContribution;
      }
      if (notificationSpaceData.communicationUpdates !== undefined) {
        settings.notification.space.communicationUpdates =
          notificationSpaceData.communicationUpdates;
      }
      if (
        notificationSpaceData.collaborationContributionCreated !== undefined
      ) {
        settings.notification.space.collaborationCalloutContributionCreated =
          notificationSpaceData.collaborationContributionCreated;
      }
      if (
        notificationSpaceData.collaborationCalloutContributionComment !==
        undefined
      ) {
        settings.notification.space.collaborationCalloutContributionComment =
          notificationSpaceData.collaborationCalloutContributionComment;
      }
      if (notificationSpaceData.collaborationCalloutComment !== undefined) {
        settings.notification.space.collaborationCalloutComment =
          notificationSpaceData.collaborationCalloutComment;
      }
      if (notificationSpaceData.collaborationCalloutPublished !== undefined) {
        settings.notification.space.collaborationCalloutPublished =
          notificationSpaceData.collaborationCalloutPublished;
      }
    }

    const notificationUserData = updateData.notification?.user;
    if (notificationUserData) {
      if (notificationUserData.messageReceived !== undefined) {
        settings.notification.user.messageReceived =
          notificationUserData.messageReceived;
      }
      if (notificationUserData.messageSent !== undefined) {
        settings.notification.user.messageSent =
          notificationUserData.messageSent;
      }
      if (notificationUserData.mentioned !== undefined) {
        settings.notification.user.mentioned = notificationUserData.mentioned;
      }
      if (notificationUserData.commentReply !== undefined) {
        settings.notification.user.commentReply =
          notificationUserData.commentReply;
      }
      if (
        notificationUserData.spaceCommunityApplicationSubmitted !== undefined
      ) {
        settings.notification.user.spaceCommunityApplicationSubmitted =
          notificationUserData.spaceCommunityApplicationSubmitted;
      }
      if (notificationUserData.spaceCommunityInvitation !== undefined) {
        settings.notification.user.spaceCommunityInvitationReceived =
          notificationUserData.spaceCommunityInvitation;
      }
      if (notificationUserData.spaceCommunityJoined !== undefined) {
        settings.notification.user.spaceCommunityJoined =
          notificationUserData.spaceCommunityJoined;
      }
    }

    const notificationVcData = updateData.notification?.virtualContributor;
    if (notificationVcData) {
      if (notificationVcData.adminSpaceCommunityInvitation !== undefined) {
        settings.notification.virtualContributor.adminSpaceCommunityInvitation =
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
