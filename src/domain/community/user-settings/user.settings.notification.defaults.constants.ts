import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

/**
 * Mandated channel defaults for notification settings rows that were added to
 * `user_settings.notification` after the column shipped.
 *
 * Each of these rows is defended in three places that MUST agree:
 *
 * 1. the backfill migration, which writes the value into existing rows;
 * 2. the `@AfterLoad` hook on `UserSettings`, which fills the key in on read
 *    for a row that predates the backfill or was inserted by an old pod
 *    during a rolling deploy;
 * 3. `NotificationRecipientsService`, which defends again at recipient
 *    resolution time.
 *
 * They previously carried three independent copies of the same literal, so
 * changing a mandated default in one place left the other two silently
 * disagreeing. Declaring them once here is what keeps (2) and (3) in step;
 * the migration in (1) is a historical record and is deliberately not
 * refactored to import these.
 */

/** "An organization you administer is invited to a Space" — all channels on. */
export const DEFAULT_ORGANIZATION_SPACE_INVITATION_CHANNELS: IUserSettingsNotificationChannels =
  Object.freeze({
    email: true,
    inApp: true,
    push: true,
  });

/** "Someone responded to an invitation you sent" — all channels on. */
export const DEFAULT_INVITATION_RESPONSE_CHANNELS: IUserSettingsNotificationChannels =
  Object.freeze({
    email: true,
    inApp: true,
    push: true,
  });

// Defend on read — a `user_settings` row that predates the backfill
// migrations lacks these keys. Same mandated default as the migrations and
// `UserSettings.applyOrganizationAssociateDefaults` (`@AfterLoad`). Shared
// by all five organization-associate rows (two user-side, three
// organisation-side) — no row is seeded from a predecessor.
// The mandated default for all five organization-associate notification
// rows (two user-side, three organisation-side) — all three channels on;
// no row is seeded from a predecessor (no event moves rows). Same
// defensive pattern as the other DEFAULT_* constants above.
export const DEFAULT_ORGANIZATION_ASSOCIATE_CHANNELS: IUserSettingsNotificationChannels =
  Object.freeze({
    email: true,
    inApp: true,
    push: true,
  });
