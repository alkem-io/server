import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { NotificationEvent } from '@common/enums/notification.event';
import { CredentialsSearchInput } from '@domain/actor/credential/dto/credentials.dto.search';

// The five platform-admin notification events this routing table governs.
// Adding a sixth `NotificationEvent` member to this list without also adding
// a row for it to `PLATFORM_ADMIN_NOTIFICATION_ROUTING` below fails to
// compile — the routing table's type is an exhaustive `Record` over this
// tuple.
export const PLATFORM_ADMIN_NOTIFICATION_EVENTS = [
  NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED,
  NotificationEvent.USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION,
  NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED,
  NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED,
  NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED,
] as const;

export type PlatformAdminNotificationEvent =
  (typeof PLATFORM_ADMIN_NOTIFICATION_EVENTS)[number];

export interface PlatformAdminNotificationRoutingRow {
  readonly recipients: readonly AuthorizationCredential[];
  readonly kind: 'ownership' | 'awareness';
  readonly excludeActor: boolean;
}

/**
 * The single declaration of which purpose-specific platform roles receive
 * each platform-admin notification event, and whether the acting operator is
 * excluded from it. This is the ONLY place these role sets are written down:
 * both the notification-recipient privilege grant
 * (`platform.service.authorization.ts`) and the per-event candidate criteria
 * (`notification.recipients.service.ts`) are derived views over these rows,
 * never a hand-typed list of their own — that divergence is exactly the
 * defect this table exists to close.
 */
export const PLATFORM_ADMIN_NOTIFICATION_ROUTING: Readonly<
  Record<PlatformAdminNotificationEvent, PlatformAdminNotificationRoutingRow>
> = {
  [NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED]: {
    recipients: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
    kind: 'ownership',
    excludeActor: true,
  },
  [NotificationEvent.USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION]: {
    recipients: [
      AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      AuthorizationCredential.PLATFORM_USERS_ADMIN,
    ],
    kind: 'ownership',
    excludeActor: true,
  },
  [NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED]: {
    recipients: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    kind: 'awareness',
    excludeActor: false,
  },
  [NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED]: {
    recipients: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    kind: 'awareness',
    excludeActor: true,
  },
  [NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED]: {
    recipients: [
      AuthorizationCredential.PLATFORM_SUPPORT,
      AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
    ],
    kind: 'awareness',
    excludeActor: false,
  },
};

// Roles that must never receive a platform-admin notification, asserted as
// an explicit invariant over the table rather than relied on implicitly
// through an exclusivity rule that lives in another module.
export const PLATFORM_ADMIN_NOTIFICATION_NEVER_RECIPIENTS: ReadonlySet<AuthorizationCredential> =
  new Set([
    AuthorizationCredential.PLATFORM_AUDIT_READER,
    AuthorizationCredential.PLATFORM_SPACES_READER,
    AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
  ]);

// The credentials granted the platform-admin notification-recipient
// privilege: the union of every row above, de-duplicated and computed once at module load. Never written as a
// literal — a maintainer who wants to change who receives a platform-admin
// notification edits a row above, and this list follows automatically.
export const PLATFORM_ADMIN_NOTIFICATION_GRANT_CREDENTIALS: readonly AuthorizationCredential[] =
  Array.from(
    new Set<AuthorizationCredential>([
      ...Object.values(PLATFORM_ADMIN_NOTIFICATION_ROUTING).flatMap(
        row => row.recipients
      ),
    ])
  );

// The candidate-recipient criteria for one platform-admin event: its row,
// shaped for `usersWithCredentials`.
export function getPlatformAdminNotificationCriteria(
  event: PlatformAdminNotificationEvent
): CredentialsSearchInput[] {
  return PLATFORM_ADMIN_NOTIFICATION_ROUTING[event].recipients.map(type => ({
    type,
    resourceID: '',
  }));
}

export function isPlatformAdminNotificationEvent(
  event: NotificationEvent
): event is PlatformAdminNotificationEvent {
  return (
    PLATFORM_ADMIN_NOTIFICATION_EVENTS as readonly NotificationEvent[]
  ).includes(event);
}
