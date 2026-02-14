import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationSettingInput } from './dto/notification.setting.input';
import { CreateUserSettingsInput } from './dto/user.settings.dto.create';
import { UpdateUserSettingsEntityInput } from './dto/user.settings.dto.update';
import { UserSettings } from './user.settings.entity';
import { IUserSettings } from './user.settings.interface';
import { userSettings } from './user.settings.schema';

@Injectable()
export class UserSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  public createUserSettings(
    settingsData: CreateUserSettingsInput
  ): IUserSettings {
    const settings = UserSettings.create({
      communication: settingsData.communication,
      privacy: settingsData.privacy,
      notification: settingsData.notification as any,
      homeSpace: settingsData.homeSpace,
    });
    settings.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.USER_SETTINGS
    );
    return settings;
  }

  private updateNotificationSetting(
    currentSetting: { email: boolean; inApp: boolean },
    updateData?: NotificationSettingInput
  ): void {
    if (updateData) {
      if (updateData.email !== undefined) {
        currentSetting.email = updateData.email;
      }
      if (updateData.inApp !== undefined) {
        currentSetting.inApp = updateData.inApp;
      }
    }
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
      this.updateNotificationSetting(
        settings.notification.platform.forumDiscussionComment,
        notificationPlatformData.forumDiscussionComment
      );
      this.updateNotificationSetting(
        settings.notification.platform.forumDiscussionCreated,
        notificationPlatformData.forumDiscussionCreated
      );

      // Handle admin platform notifications
      if (notificationPlatformData.admin) {
        const adminData = notificationPlatformData.admin;

        this.updateNotificationSetting(
          settings.notification.platform.admin.userProfileRemoved,
          adminData.userProfileRemoved
        );
        this.updateNotificationSetting(
          settings.notification.platform.admin.userProfileCreated,
          adminData.userProfileCreated
        );
        this.updateNotificationSetting(
          settings.notification.platform.admin.spaceCreated,
          adminData.spaceCreated
        );
        this.updateNotificationSetting(
          settings.notification.platform.admin.userGlobalRoleChanged,
          adminData.userGlobalRoleChanged
        );
      }
    }

    const notificationOrganizationData = updateData.notification?.organization;
    if (notificationOrganizationData) {
      this.updateNotificationSetting(
        settings.notification.organization.adminMentioned,
        notificationOrganizationData.adminMentioned
      );
      this.updateNotificationSetting(
        settings.notification.organization.adminMessageReceived,
        notificationOrganizationData.adminMessageReceived
      );
    }

    const notificationSpaceData = updateData.notification?.space;
    if (notificationSpaceData) {
      // Handle admin space notifications
      if (notificationSpaceData.admin) {
        const adminData = notificationSpaceData.admin;

        this.updateNotificationSetting(
          settings.notification.space.admin.communityApplicationReceived,
          adminData.communityApplicationReceived
        );
        this.updateNotificationSetting(
          settings.notification.space.admin.communityNewMember,
          adminData.communityNewMember
        );
        this.updateNotificationSetting(
          settings.notification.space.admin.communicationMessageReceived,
          adminData.communicationMessageReceived
        );
        this.updateNotificationSetting(
          settings.notification.space.admin
            .collaborationCalloutContributionCreated,
          adminData.collaborationCalloutContributionCreated
        );
      }

      // Handle regular space notifications
      this.updateNotificationSetting(
        settings.notification.space.communicationUpdates,
        notificationSpaceData.communicationUpdates
      );
      this.updateNotificationSetting(
        settings.notification.space.collaborationCalloutContributionCreated,
        notificationSpaceData.collaborationCalloutContributionCreated
      );
      this.updateNotificationSetting(
        settings.notification.space.collaborationCalloutPostContributionComment,
        notificationSpaceData.collaborationCalloutPostContributionComment
      );
      this.updateNotificationSetting(
        settings.notification.space.collaborationCalloutComment,
        notificationSpaceData.collaborationCalloutComment
      );
      this.updateNotificationSetting(
        settings.notification.space.collaborationCalloutPublished,
        notificationSpaceData.collaborationCalloutPublished
      );
      this.updateNotificationSetting(
        settings.notification.space.communityCalendarEvents,
        notificationSpaceData.communityCalendarEvents
      );
    }

    const notificationUserData = updateData.notification?.user;
    if (notificationUserData) {
      // Handle core user notifications
      this.updateNotificationSetting(
        settings.notification.user.messageReceived,
        notificationUserData.messageReceived
      );
      this.updateNotificationSetting(
        settings.notification.user.mentioned,
        notificationUserData.mentioned
      );
      this.updateNotificationSetting(
        settings.notification.user.commentReply,
        notificationUserData.commentReply
      );

      // Handle membership notifications
      if (notificationUserData.membership) {
        const membershipData = notificationUserData.membership;

        this.updateNotificationSetting(
          settings.notification.user.membership
            .spaceCommunityInvitationReceived,
          membershipData.spaceCommunityInvitationReceived
        );
        this.updateNotificationSetting(
          settings.notification.user.membership.spaceCommunityJoined,
          membershipData.spaceCommunityJoined
        );
      }
    }

    const notificationVcData = updateData.notification?.virtualContributor;
    if (notificationVcData) {
      this.updateNotificationSetting(
        settings.notification.virtualContributor.adminSpaceCommunityInvitation,
        notificationVcData.adminSpaceCommunityInvitation
      );
    }

    if (updateData.homeSpace) {
      // Note: spaceID can be explicitly set to null to clear
      if (updateData.homeSpace.spaceID !== undefined) {
        settings.homeSpace.spaceID = updateData.homeSpace.spaceID;

        // If clearing spaceID, also disable autoRedirect
        if (settings.homeSpace.spaceID === null) {
          settings.homeSpace.autoRedirect = false;
        }
      }

      if (updateData.homeSpace.autoRedirect !== undefined) {
        // Validation: cannot enable autoRedirect without a spaceID
        if (updateData.homeSpace.autoRedirect && !settings.homeSpace.spaceID) {
          throw new ValidationException(
            'Cannot enable auto-redirect without a home space set',
            LogContext.COMMUNITY
          );
        }
        settings.homeSpace.autoRedirect = updateData.homeSpace.autoRedirect;
      }
    }

    return settings;
  }

  async deleteUserSettings(userSettingsID: string): Promise<IUserSettings> {
    const settingsEntity = await this.getUserSettingsOrFail(userSettingsID);
    await this.db.delete(userSettings).where(eq(userSettings.id, userSettingsID));
    return settingsEntity;
  }

  async getUserSettingsOrFail(
    userSettingsID: string,
    options?: { with?: Record<string, boolean | object> }
  ): Promise<IUserSettings | never> {
    const result = await this.db.query.userSettings.findFirst({
      where: eq(userSettings.id, userSettingsID),
      with: options?.with,
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find UserSettings with ID: ${userSettingsID}`,
        LogContext.COMMUNITY
      );
    }
    return result as unknown as IUserSettings;
  }
}
