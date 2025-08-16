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
      if (notificationPlatformData.userProfileRemoved !== undefined) {
        settings.notification.platform.userProfileRemoved =
          notificationPlatformData.userProfileRemoved;
      }
      if (notificationPlatformData.newUserSignUp !== undefined) {
        settings.notification.platform.newUserSignUp =
          notificationPlatformData.newUserSignUp;
      }
      if (notificationPlatformData.spaceCreated !== undefined) {
        settings.notification.platform.spaceCreated =
          notificationPlatformData.spaceCreated;
      }
    }

    const notificationOrganizationData = updateData.notification?.organization;
    if (notificationOrganizationData) {
      if (notificationOrganizationData.mentioned !== undefined) {
        settings.notification.organization.mentioned =
          notificationOrganizationData.mentioned;
      }
      if (notificationOrganizationData.messageReceived !== undefined) {
        settings.notification.organization.messageReceived =
          notificationOrganizationData.messageReceived;
      }
    }

    const notificationSpaceData = updateData.notification?.space;
    if (notificationSpaceData) {
      if (notificationSpaceData.communityApplicationReceived !== undefined) {
        settings.notification.space.communityApplicationReceived =
          notificationSpaceData.communityApplicationReceived;
      }
      if (notificationSpaceData.communityApplicationSubmitted !== undefined) {
        settings.notification.space.communityApplicationSubmitted =
          notificationSpaceData.communityApplicationSubmitted;
      }
      if (notificationSpaceData.communicationUpdates !== undefined) {
        settings.notification.space.communicationUpdates =
          notificationSpaceData.communicationUpdates;
      }
      if (notificationSpaceData.communicationUpdatesAdmin !== undefined) {
        settings.notification.space.communicationUpdatesAdmin =
          notificationSpaceData.communicationUpdatesAdmin;
      }
      if (notificationSpaceData.communityNewMember !== undefined) {
        settings.notification.space.communityNewMember =
          notificationSpaceData.communityNewMember;
      }
      if (notificationSpaceData.communityNewMemberAdmin !== undefined) {
        settings.notification.space.communityNewMemberAdmin =
          notificationSpaceData.communityNewMemberAdmin;
      }
      if (notificationSpaceData.communityInvitationUser !== undefined) {
        settings.notification.space.communityInvitationUser =
          notificationSpaceData.communityInvitationUser;
      }
      if (notificationSpaceData.collaborationPostCreatedAdmin !== undefined) {
        settings.notification.space.collaborationPostCreatedAdmin =
          notificationSpaceData.collaborationPostCreatedAdmin;
      }
      if (notificationSpaceData.collaborationPostCreated !== undefined) {
        settings.notification.space.collaborationPostCreated =
          notificationSpaceData.collaborationPostCreated;
      }
      if (notificationSpaceData.collaborationPostCommentCreated !== undefined) {
        settings.notification.space.collaborationPostCommentCreated =
          notificationSpaceData.collaborationPostCommentCreated;
      }
      if (notificationSpaceData.collaborationWhiteboardCreated !== undefined) {
        settings.notification.space.collaborationWhiteboardCreated =
          notificationSpaceData.collaborationWhiteboardCreated;
      }
      if (notificationSpaceData.collaborationCalloutPublished !== undefined) {
        settings.notification.space.collaborationCalloutPublished =
          notificationSpaceData.collaborationCalloutPublished;
      }
      if (notificationSpaceData.communicationMessage !== undefined) {
        settings.notification.space.communicationMessage =
          notificationSpaceData.communicationMessage;
      }
      if (notificationSpaceData.communicationMessageAdmin !== undefined) {
        settings.notification.space.communicationMessageAdmin =
          notificationSpaceData.communicationMessageAdmin;
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
