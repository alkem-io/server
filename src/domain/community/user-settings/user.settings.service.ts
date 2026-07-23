import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { NotificationSettingInput } from './dto/notification.setting.input';
import { CreateUserSettingsInput } from './dto/user.settings.dto.create';
import { UpdateUserSettingsEntityInput } from './dto/user.settings.dto.update';
import { DESIGN_VERSION_CURRENT_DEFAULT } from './user.settings.design.version.constants';
import { UserSettings } from './user.settings.entity';
import { IUserSettings } from './user.settings.interface';

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
      homeSpace: settingsData.homeSpace,
      assistant: {
        enabledCapabilities: settingsData.assistant?.enabledCapabilities ?? [],
      },
      designVersion:
        settingsData.designVersion ?? DESIGN_VERSION_CURRENT_DEFAULT,
      language: settingsData.language ?? null,
      languageOfferAnswered: settingsData.languageOfferAnswered ?? false,
    });
    settings.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.USER_SETTINGS
    );
    return settings;
  }

  private updateNotificationSetting(
    currentSetting: { email: boolean; inApp: boolean; push: boolean },
    updateData?: NotificationSettingInput
  ): void {
    if (updateData) {
      if (updateData.email !== undefined) {
        currentSetting.email = updateData.email;
      }
      if (updateData.inApp !== undefined) {
        currentSetting.inApp = updateData.inApp;
      }
      if (updateData.push !== undefined) {
        currentSetting.push = updateData.push;
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
      if (
        updateData.communication.allowOtherUsersToContactViaEmail !== undefined
      ) {
        settings.communication.allowOtherUsersToContactViaEmail =
          updateData.communication.allowOtherUsersToContactViaEmail;
      }
    }

    // Assistant authority (FR-018): when enabledCapabilities is provided it
    // replaces the user's toggle set. Absence of a capability from the set means
    // disabled (the host gate treats missing/false identically). Never widened
    // beyond the user's privileges — that bound is enforced structurally at the
    // host gate, not here. See contracts/assistant-authority.md §2.
    if (
      updateData.assistant &&
      updateData.assistant.enabledCapabilities !== undefined
    ) {
      settings.assistant = {
        enabledCapabilities: updateData.assistant.enabledCapabilities.map(
          toggle => ({
            capability: toggle.capability,
            enabled: toggle.enabled,
          })
        ),
      };
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
        this.updateNotificationSetting(
          settings.notification.platform.admin.userEmailChanged,
          adminData.userEmailChanged
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
        this.updateNotificationSetting(
          settings.notification.space.admin.userEmailChanged,
          adminData.userEmailChanged
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
      this.updateNotificationSetting(
        settings.notification.space.collaborationPollVoteCastOnOwnPoll,
        notificationSpaceData.collaborationPollVoteCastOnOwnPoll
      );
      this.updateNotificationSetting(
        settings.notification.space.collaborationPollVoteCastOnPollIVotedOn,
        notificationSpaceData.collaborationPollVoteCastOnPollIVotedOn
      );
      this.updateNotificationSetting(
        settings.notification.space.collaborationPollModifiedOnPollIVotedOn,
        notificationSpaceData.collaborationPollModifiedOnPollIVotedOn
      );
      this.updateNotificationSetting(
        settings.notification.space.collaborationPollVoteAffectedByOptionChange,
        notificationSpaceData.collaborationPollVoteAffectedByOptionChange
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

    // Sound playback preferences. Merge field-by-field (never by spread) so a
    // partial update of one flag leaves the sibling flag untouched. The `!= null`
    // guards skip both undefined and an explicit null: the output fields are
    // Boolean!, so persisting a null would make every later read of this User
    // fail the non-null check.
    if (updateData.notification?.sound) {
      const soundData = updateData.notification.sound;
      if (soundData.chatMessage != null) {
        settings.notification.sound.chatMessage = soundData.chatMessage;
      }
      if (soundData.inAppNotification != null) {
        settings.notification.sound.inAppNotification =
          soundData.inAppNotification;
      }
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

    // Skip on both undefined (field omitted) and null (explicit clear is
    // unsupported — the column is NOT NULL with a default of 2).
    if (updateData.designVersion != null) {
      settings.designVersion = updateData.designVersion;
    }

    // Language preference + one-way latch (FR-023 / R-3):
    // (a) Any language write latches languageOfferAnswered = true
    //     (invariant: language ≠ NULL ⇒ flag = true).
    // (b) Setting languageOfferAnswered = true without a language is the
    //     decline path (stores the answered flag, leaves language null).
    // (c) Setting languageOfferAnswered = false is rejected — the latch is
    //     one-way; un-answering is not a valid state transition.
    if (updateData.language !== undefined) {
      settings.language = updateData.language;
      settings.languageOfferAnswered = true;
    }

    if (updateData.languageOfferAnswered !== undefined) {
      if (updateData.languageOfferAnswered === false) {
        throw new ValidationException(
          'languageOfferAnswered cannot be set back to false — it is a one-way latch (FR-005a / R-3)',
          LogContext.COMMUNITY
        );
      }
      // true: latch the flag (decline path — no language written)
      settings.languageOfferAnswered = true;
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
