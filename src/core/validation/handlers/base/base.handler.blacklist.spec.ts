import { ValidationException } from '@common/exceptions';
import {
  NotificationEmailAddressInput,
  UpdatePlatformSettingsInput,
} from '@platform/platform-settings';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { BaseHandler } from './base.handler';

// Drives the handler the way the validation pipe does (plainToInstance, then
// handle).
describe('BaseHandler — notification email blacklist inputs', () => {
  const handler = new BaseHandler();

  describe('UpdatePlatformSettingsInput', () => {
    const input = (notificationEmailBlacklist: string[]) =>
      plainToInstance(UpdatePlatformSettingsInput, {
        integration: {
          iframeAllowedUrls: ['https://example.com'],
          notificationEmailBlacklist,
        },
      });

    it('accepts a list of valid email addresses', async () => {
      await expect(
        handler.handle(
          input(['a@example.com', 'b@example.com']),
          UpdatePlatformSettingsInput
        )
      ).resolves.toBeNull();
    });

    it.each([
      'not-an-email',
      'b@example.com\r\n',
      '"b\r\nc"@example.com',
      '"b\rc"@example.com',
      '"b\nc"@example.com',
    ])('rejects a list containing %j', async entry => {
      await expect(
        handler.handle(
          input(['a@example.com', entry]),
          UpdatePlatformSettingsInput
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('NotificationEmailAddressInput', () => {
    it('lets removal reach the service with an entry already stored', async () => {
      const value = plainToInstance(NotificationEmailAddressInput, {
        email: 'someone@example.com\r\n',
      });

      await expect(
        handler.handle(value, NotificationEmailAddressInput)
      ).resolves.toBeNull();
    });
  });
});
