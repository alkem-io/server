import { ValidationException } from '@common/exceptions';
import {
  NotificationEmailAddressInput,
  UpdatePlatformSettingsInput,
} from '@platform/platform-settings';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { BaseHandler } from './base.handler';

// The handler's allowlist is opt-in: an input absent from `types[]` is never
// validated, so the decorators on it never run. These specs drive the handler
// the way the validation pipe does (plainToInstance, then handle).
describe('BaseHandler — notification email blacklist inputs', () => {
  const handler = new BaseHandler();

  describe('NotificationEmailAddressInput', () => {
    const input = (email: string) =>
      plainToInstance(NotificationEmailAddressInput, { email });

    it('accepts a valid email address', async () => {
      await expect(
        handler.handle(
          input('Someone@Example.com'),
          NotificationEmailAddressInput
        )
      ).resolves.toBeNull();
    });

    it.each([
      'not-an-email',
      'someone@example.com\r\n',
      'someone@example.com\nsomeone-else@example.com',
      'someone@exa\rmple.com',
    ])('rejects %j', async email => {
      await expect(
        handler.handle(input(email), NotificationEmailAddressInput)
      ).rejects.toThrow(ValidationException);
    });
  });

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

    it('rejects a list containing one invalid entry', async () => {
      await expect(
        handler.handle(
          input(['a@example.com', 'b@example.com\r\n']),
          UpdatePlatformSettingsInput
        )
      ).rejects.toThrow(ValidationException);
    });
  });
});
