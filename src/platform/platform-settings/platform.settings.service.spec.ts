import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { PlatformSettingsService } from './platform.settings.service';
import { IPlatformSettings } from './platform.settings.interface';
import { EntityNotInitializedException } from '@common/exceptions';

describe('PlatformSettingsService', () => {
  let service: PlatformSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformSettingsService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformSettingsService);
  });

  describe('updateSettings', () => {
    it('should update iframeAllowedUrls when provided in updateData', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: ['https://old.com'],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      const result = service.updateSettings(settings, {
        integration: {
          iframeAllowedUrls: ['https://new.com', 'https://another.com'],
        },
      });

      expect(result.integration.iframeAllowedUrls).toEqual([
        'https://new.com',
        'https://another.com',
      ]);
    });

    it('should update notificationEmailBlacklist when provided in updateData', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: ['https://old.com'],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      const result = service.updateSettings(settings, {
        integration: {
          notificationEmailBlacklist: ['blocked@example.com'],
        },
      });

      expect(result.integration.notificationEmailBlacklist).toEqual([
        'blocked@example.com',
      ]);
    });

    it('should not modify fields when updateData.integration is undefined', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: ['https://keep.com'],
          notificationEmailBlacklist: ['keep@example.com'],
        },
      } as IPlatformSettings;

      const result = service.updateSettings(settings, {});

      expect(result.integration.iframeAllowedUrls).toEqual([
        'https://keep.com',
      ]);
      expect(result.integration.notificationEmailBlacklist).toEqual([
        'keep@example.com',
      ]);
    });

    it('should initialize notificationEmailBlacklist to empty array if missing from settings', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: undefined as any,
        },
      } as IPlatformSettings;

      const result = service.updateSettings(settings, {});

      expect(result.integration.notificationEmailBlacklist).toEqual([]);
    });
  });

  describe('addIframeAllowedURLOrFail', () => {
    it('should throw EntityNotInitializedException when integration is undefined', () => {
      const settings = {
        integration: undefined,
      } as unknown as IPlatformSettings;

      expect(() =>
        service.addIframeAllowedURLOrFail(settings, 'https://new.com')
      ).toThrow(EntityNotInitializedException);
    });

    it('should add URL when not already present', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: ['https://existing.com'],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      const result = service.addIframeAllowedURLOrFail(
        settings,
        'https://new.com'
      );

      expect(result).toContain('https://existing.com');
      expect(result).toContain('https://new.com');
      expect(result).toHaveLength(2);
    });

    it('should not duplicate URL when already present', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: ['https://existing.com'],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      const result = service.addIframeAllowedURLOrFail(
        settings,
        'https://existing.com'
      );

      expect(result).toHaveLength(1);
      expect(result).toEqual(['https://existing.com']);
    });
  });

  describe('removeIframeAllowedURLOrFail', () => {
    it('should throw EntityNotInitializedException when integration is undefined', () => {
      const settings = {
        integration: undefined,
      } as unknown as IPlatformSettings;

      expect(() =>
        service.removeIframeAllowedURLOrFail(settings, 'https://any.com')
      ).toThrow(EntityNotInitializedException);
    });

    it('should remove the specified URL from the list', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: ['https://keep.com', 'https://remove.com'],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      const result = service.removeIframeAllowedURLOrFail(
        settings,
        'https://remove.com'
      );

      expect(result).toEqual(['https://keep.com']);
    });

    it('should return empty array when removing the only URL', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: ['https://only.com'],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      const result = service.removeIframeAllowedURLOrFail(
        settings,
        'https://only.com'
      );

      expect(result).toEqual([]);
    });

    it('should return unchanged list when URL not present', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: ['https://keep.com'],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      const result = service.removeIframeAllowedURLOrFail(
        settings,
        'https://nonexistent.com'
      );

      expect(result).toEqual(['https://keep.com']);
    });
  });

  describe('addNotificationEmailToBlacklistOrFail', () => {
    it('should throw EntityNotInitializedException when integration is undefined', () => {
      const settings = {
        integration: undefined,
      } as unknown as IPlatformSettings;

      expect(() =>
        service.addNotificationEmailToBlacklistOrFail(
          settings,
          'test@example.com'
        )
      ).toThrow(EntityNotInitializedException);
    });

    it('should add email in lowercase', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      const result = service.addNotificationEmailToBlacklistOrFail(
        settings,
        'Test@Example.COM'
      );

      expect(result).toEqual(['test@example.com']);
    });

    it('should reject wildcard character *', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      expect(() =>
        service.addNotificationEmailToBlacklistOrFail(settings, '*@example.com')
      ).toThrow('Wildcard characters are not allowed in email addresses');
    });

    it('should reject wildcard character ?', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: [],
        },
      } as IPlatformSettings;

      expect(() =>
        service.addNotificationEmailToBlacklistOrFail(
          settings,
          'test?@example.com'
        )
      ).toThrow('Wildcard characters are not allowed in email addresses');
    });

    it('should throw when duplicate email (case-insensitive)', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: ['existing@example.com'],
        },
      } as IPlatformSettings;

      expect(() =>
        service.addNotificationEmailToBlacklistOrFail(
          settings,
          'EXISTING@EXAMPLE.COM'
        )
      ).toThrow('already in the blacklist');
    });

    it('should throw when blacklist limit of 250 is reached', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: Array.from(
            { length: 250 },
            (_, i) => `user${i}@example.com`
          ),
        },
      } as IPlatformSettings;

      expect(() =>
        service.addNotificationEmailToBlacklistOrFail(
          settings,
          'overflow@example.com'
        )
      ).toThrow('Blacklist limit of 250 entries reached');
    });

    it('should initialize blacklist array when undefined', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: undefined as any,
        },
      } as IPlatformSettings;

      const result = service.addNotificationEmailToBlacklistOrFail(
        settings,
        'new@example.com'
      );

      expect(result).toEqual(['new@example.com']);
    });
  });

  describe('removeNotificationEmailFromBlacklistOrFail', () => {
    it('should throw EntityNotInitializedException when integration is undefined', () => {
      const settings = {
        integration: undefined,
      } as unknown as IPlatformSettings;

      expect(() =>
        service.removeNotificationEmailFromBlacklistOrFail(
          settings,
          'test@example.com'
        )
      ).toThrow(EntityNotInitializedException);
    });

    it('should remove email case-insensitively', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: ['test@example.com', 'other@example.com'],
        },
      } as IPlatformSettings;

      const result = service.removeNotificationEmailFromBlacklistOrFail(
        settings,
        'TEST@EXAMPLE.COM'
      );

      expect(result).toEqual(['other@example.com']);
    });

    it('should throw when email not found in blacklist', () => {
      const settings = {
        integration: {
          iframeAllowedUrls: [],
          notificationEmailBlacklist: ['other@example.com'],
        },
      } as IPlatformSettings;

      expect(() =>
        service.removeNotificationEmailFromBlacklistOrFail(
          settings,
          'missing@example.com'
        )
      ).toThrow('not found in blacklist');
    });
  });
});
