import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateUserSettingsNotificationUserInput } from './user.settings.notification.user.dto.create';

/**
 * Every notification row on this input is a CHANNELS OBJECT
 * (`{ email, inApp, push }`), not a boolean — but all five were decorated
 * `@IsBoolean()`. Nothing routes this input through the global ValidationPipe
 * today, which is the only reason it never bit; the moment a mutation exposes
 * it, every well-formed payload would have been rejected with
 * "<row> must be a boolean value". 034-messaging-notifications propagated the
 * mistake onto its two new rows by copying the neighbouring ones, so all five
 * are corrected together.
 */
const validPayload = () => ({
  messageReceived: { email: true, inApp: true, push: false },
  mentioned: { email: true, inApp: true, push: false },
  commentReply: { email: true, inApp: true, push: false },
  conversationMessageDirect: { email: false, inApp: false, push: true },
  conversationMessageGroup: { email: false, inApp: false, push: true },
  membership: {
    spaceCommunityInvitationReceived: { email: true, inApp: true, push: false },
    spaceCommunityJoined: { email: true, inApp: true, push: false },
  },
});

describe('CreateUserSettingsNotificationUserInput', () => {
  it('accepts a well-formed nested channels payload', async () => {
    const instance = plainToInstance(
      CreateUserSettingsNotificationUserInput,
      validPayload()
    );

    await expect(validate(instance)).resolves.toEqual([]);
  });

  it.each([
    'messageReceived',
    'mentioned',
    'commentReply',
    'conversationMessageDirect',
    'conversationMessageGroup',
  ])('does not demand that %s be a boolean', async row => {
    const instance = plainToInstance(CreateUserSettingsNotificationUserInput, {
      ...validPayload(),
      [row]: { email: true, inApp: false, push: true },
    });

    const errors = await validate(instance);

    expect(
      errors.flatMap(error => Object.values(error.constraints ?? {}))
    ).not.toContain(`${row} must be a boolean value`);
  });

  it('still rejects a row that is genuinely the wrong shape', async () => {
    const instance = plainToInstance(CreateUserSettingsNotificationUserInput, {
      ...validPayload(),
      conversationMessageDirect: { email: 'yes', inApp: false, push: true },
    });

    const errors = await validate(instance);

    expect(errors).not.toEqual([]);
  });
});
