import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { UpdateUserSettingsEntityInput } from './dto/user.settings.dto.update';
import { UserSettings } from './user.settings.entity';
import { IUserSettings } from './user.settings.interface';
import { UserSettingsService } from './user.settings.service';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let repository: {
    findOne: Mock;
    save: Mock;
    remove: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSettingsService,
        repositoryProviderMockFactory(UserSettings),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UserSettingsService);
    repository = module.get(getRepositoryToken(UserSettings));
  });

  const defaultNotificationSetting = () => ({ email: false, inApp: false });

  const buildSettings = (
    overrides: Partial<IUserSettings> = {}
  ): IUserSettings => {
    return {
      privacy: { contributionRolesPubliclyVisible: false },
      communication: { allowOtherUsersToSendMessages: false },
      notification: {
        platform: {
          forumDiscussionComment: defaultNotificationSetting(),
          forumDiscussionCreated: defaultNotificationSetting(),
          admin: {
            userProfileRemoved: defaultNotificationSetting(),
            userProfileCreated: defaultNotificationSetting(),
            spaceCreated: defaultNotificationSetting(),
            userGlobalRoleChanged: defaultNotificationSetting(),
          },
        },
        organization: {
          adminMentioned: defaultNotificationSetting(),
          adminMessageReceived: defaultNotificationSetting(),
        },
        user: {
          messageReceived: defaultNotificationSetting(),
          mentioned: defaultNotificationSetting(),
          commentReply: defaultNotificationSetting(),
          membership: {
            spaceCommunityInvitationReceived: defaultNotificationSetting(),
            spaceCommunityJoined: defaultNotificationSetting(),
          },
        },
        space: {
          admin: {
            communityApplicationReceived: defaultNotificationSetting(),
            communityNewMember: defaultNotificationSetting(),
            communicationMessageReceived: defaultNotificationSetting(),
            collaborationCalloutContributionCreated:
              defaultNotificationSetting(),
          },
          communicationUpdates: defaultNotificationSetting(),
          collaborationCalloutContributionCreated: defaultNotificationSetting(),
          collaborationCalloutPostContributionComment:
            defaultNotificationSetting(),
          collaborationCalloutComment: defaultNotificationSetting(),
          collaborationCalloutPublished: defaultNotificationSetting(),
          communityCalendarEvents: defaultNotificationSetting(),
        },
        virtualContributor: {
          adminSpaceCommunityInvitation: defaultNotificationSetting(),
        },
      },
      homeSpace: {
        spaceID: null,
        autoRedirect: false,
      },
      ...overrides,
    } as IUserSettings;
  };

  describe('updateSettings - privacy', () => {
    it('should update contributionRolesPubliclyVisible when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(true);
    });

    it('should not change privacy when privacy update data is omitted', () => {
      const settings = buildSettings({
        privacy: { contributionRolesPubliclyVisible: true },
      } as any);
      const updateData: UpdateUserSettingsEntityInput = {};

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(true);
    });
  });

  describe('updateSettings - communication', () => {
    it('should update allowOtherUsersToSendMessages when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        communication: { allowOtherUsersToSendMessages: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.communication.allowOtherUsersToSendMessages).toBe(true);
    });
  });

  describe('updateSettings - homeSpace', () => {
    it('should set the home space ID when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        homeSpace: { spaceID: 'space-1' },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.homeSpace.spaceID).toBe('space-1');
    });

    it('should clear spaceID and disable autoRedirect when spaceID is set to null', () => {
      const settings = buildSettings({
        homeSpace: { spaceID: 'space-1', autoRedirect: true },
      } as any);
      const updateData: UpdateUserSettingsEntityInput = {
        homeSpace: { spaceID: null },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.homeSpace.spaceID).toBeNull();
      expect(result.homeSpace.autoRedirect).toBe(false);
    });

    it('should enable autoRedirect when a home space is already set', () => {
      const settings = buildSettings({
        homeSpace: { spaceID: 'space-1', autoRedirect: false },
      } as any);
      const updateData: UpdateUserSettingsEntityInput = {
        homeSpace: { autoRedirect: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.homeSpace.autoRedirect).toBe(true);
    });

    it('should throw ValidationException when enabling autoRedirect without a home space set', () => {
      const settings = buildSettings({
        homeSpace: { spaceID: null, autoRedirect: false },
      } as any);
      const updateData: UpdateUserSettingsEntityInput = {
        homeSpace: { autoRedirect: true },
      };

      expect(() => service.updateSettings(settings, updateData)).toThrow(
        ValidationException
      );
    });

    it('should allow setting spaceID and autoRedirect simultaneously', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        homeSpace: { spaceID: 'space-1', autoRedirect: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.homeSpace.spaceID).toBe('space-1');
      expect(result.homeSpace.autoRedirect).toBe(true);
    });

    it('should throw ValidationException when clearing spaceID and enabling autoRedirect simultaneously', () => {
      const settings = buildSettings({
        homeSpace: { spaceID: 'space-1', autoRedirect: false },
      } as any);
      const updateData: UpdateUserSettingsEntityInput = {
        homeSpace: { spaceID: null, autoRedirect: true },
      };

      expect(() => service.updateSettings(settings, updateData)).toThrow(
        ValidationException
      );
    });
  });

  describe('updateSettings - notification.platform', () => {
    it('should update forumDiscussionComment email notification', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        notification: {
          platform: {
            forumDiscussionComment: { email: true },
          },
        },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.notification.platform.forumDiscussionComment.email).toBe(
        true
      );
      expect(result.notification.platform.forumDiscussionComment.inApp).toBe(
        false
      );
    });

    it('should update admin spaceCreated notification', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        notification: {
          platform: {
            admin: {
              spaceCreated: { email: true, inApp: true },
            },
          },
        },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.notification.platform.admin.spaceCreated.email).toBe(true);
      expect(result.notification.platform.admin.spaceCreated.inApp).toBe(true);
    });
  });

  describe('updateSettings - notification.space', () => {
    it('should update admin.communityApplicationReceived notification', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        notification: {
          space: {
            admin: {
              communityApplicationReceived: { email: true },
            },
          },
        },
      };

      const result = service.updateSettings(settings, updateData);

      expect(
        result.notification.space.admin.communityApplicationReceived.email
      ).toBe(true);
    });

    it('should update communicationUpdates notification', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        notification: {
          space: {
            communicationUpdates: { inApp: true },
          },
        },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.notification.space.communicationUpdates.inApp).toBe(true);
    });
  });

  describe('updateSettings - notification.user', () => {
    it('should update messageReceived notification', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        notification: {
          user: {
            messageReceived: { email: true, inApp: true },
          } as any,
        },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.notification.user.messageReceived.email).toBe(true);
      expect(result.notification.user.messageReceived.inApp).toBe(true);
    });

    it('should update membership.spaceCommunityInvitationReceived notification', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        notification: {
          user: {
            membership: {
              spaceCommunityInvitationReceived: { email: true },
            },
          },
        },
      };

      const result = service.updateSettings(settings, updateData);

      expect(
        result.notification.user.membership.spaceCommunityInvitationReceived
          .email
      ).toBe(true);
    });
  });

  describe('updateSettings - notification.virtualContributor', () => {
    it('should update adminSpaceCommunityInvitation notification', () => {
      const settings = buildSettings();
      const updateData: UpdateUserSettingsEntityInput = {
        notification: {
          virtualContributor: {
            adminSpaceCommunityInvitation: { email: true, inApp: true },
          },
        },
      };

      const result = service.updateSettings(settings, updateData);

      expect(
        result.notification.virtualContributor.adminSpaceCommunityInvitation
          .email
      ).toBe(true);
      expect(
        result.notification.virtualContributor.adminSpaceCommunityInvitation
          .inApp
      ).toBe(true);
    });
  });

  describe('getUserSettingsOrFail', () => {
    it('should return user settings when found', async () => {
      const mockSettings = { id: 'settings-1' };
      repository.findOne.mockResolvedValue(mockSettings);

      const result = await service.getUserSettingsOrFail('settings-1');

      expect(result).toBe(mockSettings);
    });

    it('should throw EntityNotFoundException when settings are not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserSettingsOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('deleteUserSettings', () => {
    it('should find and remove the user settings', async () => {
      const mockSettings = { id: 'settings-1' };
      repository.findOne.mockResolvedValue(mockSettings);
      repository.remove.mockResolvedValue(mockSettings);

      const result = await service.deleteUserSettings('settings-1');

      expect(result).toBe(mockSettings);
      expect(repository.remove).toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when settings do not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.deleteUserSettings('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
