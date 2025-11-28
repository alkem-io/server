import { EntityNotInitializedException } from '@common/exceptions';
import { PlatformSettingsService } from '@platform/platform-settings/platform.settings.service';
import { IPlatformSettings } from '@platform/platform-settings/platform.settings.interface';
import { IPlatformSettingsIntegration } from '@platform/platform-settings/platform.settings.integrations.interface';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Test, TestingModule } from '@nestjs/testing';

describe('PlatformSettingsService - notification email blacklist', () => {
  let service: PlatformSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformSettingsService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformSettingsService);
  });

  const createSettings = (
    overrides?: Partial<IPlatformSettingsIntegration>
  ): IPlatformSettings =>
    ({
      integration: {
        iframeAllowedUrls: [],
        notificationEmailBlacklist: [],
        ...overrides,
      } as IPlatformSettingsIntegration,
    }) as IPlatformSettings;

  describe('addNotificationEmailToBlacklistOrFail', () => {
    it('adds the canonicalized email to the blacklist', () => {
      const settings = createSettings();

      const result = service.addNotificationEmailToBlacklistOrFail(
        settings,
        'Test@Example.com'
      );

      expect(result).toEqual(['test@example.com']);
      expect(settings.integration.notificationEmailBlacklist).toEqual([
        'test@example.com',
      ]);
    });

    it('throws when the integration settings are missing', () => {
      const settings = {
        integration: undefined,
      } as unknown as IPlatformSettings;

      expect(() =>
        service.addNotificationEmailToBlacklistOrFail(
          settings,
          'user@example.com'
        )
      ).toThrow(EntityNotInitializedException);
    });

    it.each(['*', '?'])(
      'rejects wildcard character %s in email addresses',
      wildcard => {
        const settings = createSettings();

        expect(() =>
          service.addNotificationEmailToBlacklistOrFail(
            settings,
            `user${wildcard}@example.com`
          )
        ).toThrow('Wildcard characters are not allowed in email addresses');
      }
    );

    it('prevents duplicate entries regardless of case', () => {
      const settings = createSettings({
        notificationEmailBlacklist: ['existing@example.com'],
      });

      expect(() =>
        service.addNotificationEmailToBlacklistOrFail(
          settings,
          'Existing@Example.com'
        )
      ).toThrow('Email existing@example.com is already in the blacklist');
    });

    it('enforces the 250-entry limit', () => {
      const limit = Array.from(
        { length: 250 },
        (_, index) => `user${index}@example.com`
      );
      const settings = createSettings({ notificationEmailBlacklist: limit });

      expect(() =>
        service.addNotificationEmailToBlacklistOrFail(
          settings,
          'overflow@example.com'
        )
      ).toThrow(
        'Blacklist limit of 250 entries reached. Remove entries before adding new ones.'
      );
    });
  });

  describe('removeNotificationEmailFromBlacklistOrFail', () => {
    it('removes the canonicalized email from the blacklist', () => {
      const settings = createSettings({
        notificationEmailBlacklist: ['user@example.com', 'other@example.com'],
      });

      const result = service.removeNotificationEmailFromBlacklistOrFail(
        settings,
        'User@example.com'
      );

      expect(result).toEqual(['other@example.com']);
    });

    it('throws when the email is missing from the blacklist', () => {
      const settings = createSettings({
        notificationEmailBlacklist: ['existing@example.com'],
      });

      expect(() =>
        service.removeNotificationEmailFromBlacklistOrFail(
          settings,
          'missing@example.com'
        )
      ).toThrow('Email missing@example.com not found in blacklist');
    });

    it('throws when the integration settings are missing', () => {
      const settings = {
        integration: undefined,
      } as unknown as IPlatformSettings;

      expect(() =>
        service.removeNotificationEmailFromBlacklistOrFail(
          settings,
          'user@example.com'
        )
      ).toThrow(EntityNotInitializedException);
    });
  });
});
