import { describe, expect, it } from 'vitest';
import { UserSettings } from './user.settings.entity';

/**
 * 034-messaging-notifications (corr-server-3): the `@AfterLoad` defaulting
 * hook must heal a `user_settings` row whose `notification.user` object
 * predates the two messaging-notification keys, without ever throwing and
 * without touching a row that already carries them.
 */
describe('UserSettings entity — applyConversationMessageNotificationDefaults (@AfterLoad)', () => {
  const DEFAULT_CHANNELS = { email: false, inApp: false, push: true };

  it('fills in both missing keys with the mandated default', () => {
    const settings = new UserSettings();
    settings.notification = {
      user: {
        messageReceived: { email: true, inApp: true, push: true },
      },
    } as any;

    settings.applyConversationMessageNotificationDefaults();

    expect(settings.notification.user.conversationMessageDirect).toEqual(
      DEFAULT_CHANNELS
    );
    expect(settings.notification.user.conversationMessageGroup).toEqual(
      DEFAULT_CHANNELS
    );
  });

  it('never overwrites an existing (non-default) row', () => {
    const settings = new UserSettings();
    settings.notification = {
      user: {
        conversationMessageDirect: { email: true, inApp: false, push: false },
        conversationMessageGroup: { email: true, inApp: false, push: true },
      },
    } as any;

    settings.applyConversationMessageNotificationDefaults();

    expect(settings.notification.user.conversationMessageDirect).toEqual({
      email: true,
      inApp: false,
      push: false,
    });
    expect(settings.notification.user.conversationMessageGroup).toEqual({
      email: true,
      inApp: false,
      push: true,
    });
  });

  it('is a no-op (never throws) when notification.user is entirely absent', () => {
    const settings = new UserSettings();
    settings.notification = {} as any;

    expect(() =>
      settings.applyConversationMessageNotificationDefaults()
    ).not.toThrow();
    expect(settings.notification.user).toBeUndefined();
  });

  it('is a no-op (never throws) when notification itself is absent', () => {
    const settings = new UserSettings();

    expect(() =>
      settings.applyConversationMessageNotificationDefaults()
    ).not.toThrow();
  });
});

// The `@AfterLoad` defaulting hook must heal a `notification.organization`
// object whose row predates the "organization invited to a Space" key,
// without ever throwing and without touching a row that already carries it.
describe('UserSettings entity — applyOrganizationSpaceInvitationDefaults (@AfterLoad)', () => {
  const DEFAULT_CHANNELS = { email: true, inApp: true, push: true };

  it('fills in the missing key with the mandated default', () => {
    const settings = new UserSettings();
    settings.notification = {
      organization: {
        adminMentioned: { email: true, inApp: true, push: true },
      },
    } as any;

    settings.applyOrganizationSpaceInvitationDefaults();

    expect(
      settings.notification.organization.adminSpaceCommunityInvitation
    ).toEqual(DEFAULT_CHANNELS);
  });

  it('never overwrites an existing (non-default) row', () => {
    const settings = new UserSettings();
    settings.notification = {
      organization: {
        adminSpaceCommunityInvitation: {
          email: false,
          inApp: false,
          push: false,
        },
      },
    } as any;

    settings.applyOrganizationSpaceInvitationDefaults();

    expect(
      settings.notification.organization.adminSpaceCommunityInvitation
    ).toEqual({ email: false, inApp: false, push: false });
  });

  it('is a no-op (never throws) when notification.organization is entirely absent', () => {
    const settings = new UserSettings();
    settings.notification = {} as any;

    expect(() =>
      settings.applyOrganizationSpaceInvitationDefaults()
    ).not.toThrow();
    expect(settings.notification.organization).toBeUndefined();
  });

  it('is a no-op (never throws) when notification itself is absent', () => {
    const settings = new UserSettings();

    expect(() =>
      settings.applyOrganizationSpaceInvitationDefaults()
    ).not.toThrow();
  });
});
