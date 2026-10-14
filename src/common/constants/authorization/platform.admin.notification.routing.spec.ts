import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { NotificationEvent } from '@common/enums/notification.event';
import { ROLE_CREDENTIAL_MAP } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { PLATFORM_FAMILY_ROLES } from '@platform/platform-role/platform.role.assignment.rules.service';
import {
  getPlatformAdminNotificationCriteria,
  isPlatformAdminNotificationEvent,
  PLATFORM_ADMIN_NOTIFICATION_EVENTS,
  PLATFORM_ADMIN_NOTIFICATION_GRANT_CREDENTIALS,
  PLATFORM_ADMIN_NOTIFICATION_NEVER_RECIPIENTS,
  PLATFORM_ADMIN_NOTIFICATION_ROUTING,
  type PlatformAdminNotificationEvent,
} from './platform.admin.notification.routing';

describe('platform admin notification routing', () => {
  const events = [...PLATFORM_ADMIN_NOTIFICATION_EVENTS];

  it('has exactly the five platform-admin events as keys (I4)', () => {
    expect(events).toHaveLength(5);
    expect(new Set(Object.keys(PLATFORM_ADMIN_NOTIFICATION_ROUTING))).toEqual(
      new Set(events)
    );
    for (const event of events) {
      expect(Object.values(NotificationEvent)).toContain(event);
    }
  });

  it('derives the grant as the de-duplicated union of every row', () => {
    const manualUnion = new Set<AuthorizationCredential>(
      events.flatMap(
        event => PLATFORM_ADMIN_NOTIFICATION_ROUTING[event].recipients
      )
    );

    expect(new Set(PLATFORM_ADMIN_NOTIFICATION_GRANT_CREDENTIALS)).toEqual(
      manualUnion
    );
    expect(PLATFORM_ADMIN_NOTIFICATION_GRANT_CREDENTIALS).toHaveLength(
      manualUnion.size
    );
    expect(manualUnion).toEqual(
      new Set([
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.PLATFORM_SUPPORT,
        AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
      ])
    );
  });

  it.each(
    events
  )('criteria for %s equal exactly that event row, one criterion per credential', event => {
    const criteria = getPlatformAdminNotificationCriteria(event);
    expect(criteria.map(c => c.type)).toEqual(
      PLATFORM_ADMIN_NOTIFICATION_ROUTING[event].recipients
    );
    expect(criteria.every(c => c.resourceID === '')).toBe(true);
  });

  it('I1 — no row names Audit Reader, Spaces Reader or Content Full Access', () => {
    for (const event of events) {
      for (const recipient of PLATFORM_ADMIN_NOTIFICATION_ROUTING[event]
        .recipients) {
        expect(
          PLATFORM_ADMIN_NOTIFICATION_NEVER_RECIPIENTS.has(recipient)
        ).toBe(false);
      }
    }
  });

  it('I2 — every recipient belongs to the Platform family', () => {
    const platformFamilyCredentials = new Set(
      [...PLATFORM_FAMILY_ROLES].map(role => ROLE_CREDENTIAL_MAP[role])
    );
    for (const event of events) {
      for (const recipient of PLATFORM_ADMIN_NOTIFICATION_ROUTING[event]
        .recipients) {
        expect(platformFamilyCredentials.has(recipient)).toBe(true);
      }
    }
  });

  it('I3 — no row names a Feature credential', () => {
    for (const event of events) {
      for (const recipient of PLATFORM_ADMIN_NOTIFICATION_ROUTING[event]
        .recipients) {
        expect(recipient.startsWith('feature-')).toBe(false);
      }
    }
  });

  it('excludeActor is true exactly for the role-changed, email-change and profile-removed rows', () => {
    const expected: Record<PlatformAdminNotificationEvent, boolean> = {
      [NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED]: true,
      [NotificationEvent.USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION]: true,
      [NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED]: false,
      [NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED]: true,
      [NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED]: false,
    };
    for (const event of events) {
      expect(PLATFORM_ADMIN_NOTIFICATION_ROUTING[event].excludeActor).toBe(
        expected[event]
      );
    }
  });

  it('kind matches the operator matrix', () => {
    const expected: Record<
      PlatformAdminNotificationEvent,
      'ownership' | 'awareness'
    > = {
      [NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED]: 'ownership',
      [NotificationEvent.USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION]:
        'ownership',
      [NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED]: 'awareness',
      [NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED]: 'awareness',
      [NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED]: 'awareness',
    };
    for (const event of events) {
      expect(PLATFORM_ADMIN_NOTIFICATION_ROUTING[event].kind).toBe(
        expected[event]
      );
    }
  });

  it('isPlatformAdminNotificationEvent recognizes exactly the five events', () => {
    for (const event of Object.values(NotificationEvent)) {
      expect(isPlatformAdminNotificationEvent(event)).toBe(
        (events as NotificationEvent[]).includes(event)
      );
    }
  });
});
