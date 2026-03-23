# Data Model: PWA Push Notifications

**Feature**: 038-pwa-push-notifications | **Date**: 2026-03-01

## New Entities

### PushSubscription

Represents a user's Web Push subscription on a specific device/browser.

**Table**: `push_subscription`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, auto-generated (`uuid_generate_v4()`) | Unique subscription ID |
| `createdDate` | `timestamp` | NOT NULL, auto-set | When subscription was created |
| `updatedDate` | `timestamp` | NOT NULL, auto-set | When subscription was last updated |
| `endpoint` | `varchar(2048)` | NOT NULL | Push service endpoint URL |
| `p256dh` | `varchar(512)` | NOT NULL | Client public key for encryption |
| `auth` | `varchar(512)` | NOT NULL | Authentication secret |
| `status` | `varchar(128)` | NOT NULL | Subscription status: `active` \| `expired`. Default `'active'` set in migration SQL only. |
| `userAgent` | `varchar(512)` | NULLABLE | Browser/device user agent string for display |
| `lastActiveDate` | `timestamp` | NULLABLE | Last successful notification delivery |
| `userId` | `uuid` | FK → `user.id`, ON DELETE CASCADE, NOT NULL | Owning user |

**Indexes**:
- `IDX_push_subscription_userId_status` on (`userId`, `status`) — efficient lookup of active subscriptions per user
- `IDX_push_subscription_endpoint` UNIQUE on (`endpoint`) — prevent duplicate subscriptions for same browser

**Entity class**: Extends `BaseAlkemioEntity` (has `id`, `createdDate`, `updatedDate`)

```typescript
@Entity('push_subscription')
export class PushSubscription extends BaseAlkemioEntity {
  @Column('varchar', { length: LONG_TEXT_LENGTH, nullable: false })
  endpoint!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  p256dh!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  auth!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  status!: string; // 'active' | 'expired'

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  userAgent?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveDate?: Date;

  @ManyToOne(() => User, { eager: false, cascade: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column('uuid', { nullable: false })
  userId!: string;
}
```

**Validation Rules**:
- `endpoint` must be a valid HTTPS URL
- `p256dh` and `auth` must be non-empty Base64URL strings
- Max 10 active subscriptions per user (enforced at service layer; oldest replaced when cap exceeded)

**State Transitions**:
```
[Created] → active
  active → expired   (on 410 Gone or 4xx from push service)
  active → [Deleted] (user unsubscribes, cap replacement, or stale cleanup)
  expired → [Deleted] (cleanup cron removes expired records)
```

## Modified Entities

### IUserSettingsNotificationChannels (JSONB, no table change)

**Current**:
```typescript
{
  email: boolean;
  inApp: boolean;
}
```

**After**:
```typescript
{
  email: boolean;
  inApp: boolean;
  push: boolean;  // NEW
}
```

This interface is the leaf node used at every notification event category in the user settings JSONB structure. Adding `push` extends all ~24 leaf nodes simultaneously because they all share this type (20 original + 4 poll notification categories added by develop merge).

**Migration Strategy**:
- PostgreSQL JSONB handles missing keys gracefully — existing rows with `{email, inApp}` won't break
- Data migration `1772396107070-AddPushFieldToNotificationSettings` uses `jsonb_set` to add `push` field to all original leaf nodes, mirroring the `inApp` value
- Data migration `1774254508094-AddPushFieldToPollNotificationSettings` backfills `push` field on the 4 poll notification leaf nodes introduced by the `CommunityPolls` migration (which only set `{email, inApp}`)
- New user defaults in `getDefaultUserSettings()` include `push` mirroring `inApp` for all categories (poll notifications default to `push: false`)

### NotificationRecipientResult (DTO, no table)

**Current**:
```typescript
{
  emailRecipients: IUser[];
  inAppRecipients: IUser[];
  triggeredBy?: IUser;
}
```

**After**:
```typescript
{
  emailRecipients: IUser[];
  inAppRecipients: IUser[];
  pushRecipients: IUser[];  // NEW
  triggeredBy?: IUser;
}
```

## Relationships

```
User (1) ────── (0..10) PushSubscription
  │                      │
  │ cascade delete       │ FK: userId → user.id
  │                      │ ON DELETE CASCADE
  │
  └── UserSettings (1:1)
       └── notification (JSONB)
            └── platform / space / user / org / vc
                 └── {email, inApp, push} ← push added
```

## RabbitMQ Message Schema (Ephemeral — Not Persisted)

### Push Notification Message

Published to `alkemio-push-notifications` queue:

```typescript
interface PushNotificationMessage {
  subscriptionId: string;     // Target push subscription UUID
  userId: string;             // Target user UUID
  endpoint: string;           // Push service endpoint URL
  keys: {
    p256dh: string;           // Client public key
    auth: string;             // Auth secret
  };
  payload: {
    title: string;            // Notification title
    body: string;             // Notification body text
    url: string;              // Deep link URL
    eventType: string;        // NotificationEvent enum value
    timestamp: string;        // ISO 8601 creation timestamp
  };
  retryCount: number;         // Always 0 — no automatic retry implemented (messages are dropped on failure)
}
```

## Redis Key Schema (Ephemeral — TTL Managed)

### Throttle Counter

```
Key:    push:throttle:{userId}
Value:  integer (INCR)
TTL:    60 seconds (auto-expire)
```

Logic: Before sending push to user, `INCR` key. If value > 10, drop notification silently.

## Configuration Schema (alkemio.yml)

```yaml
notifications:
  enabled: ${NOTIFICATIONS_ENABLED}:true
  push:
    enabled: ${PUSH_NOTIFICATIONS_ENABLED}:false
    vapid:
      public_key: ${VAPID_PUBLIC_KEY}:
      private_key: ${VAPID_PRIVATE_KEY}:
      subject: ${VAPID_SUBJECT}:mailto:notifications@alkem.io
    max_subscriptions_per_user: ${PUSH_MAX_SUBSCRIPTIONS_PER_USER}:10
    throttle:
      max_per_minute: ${PUSH_THROTTLE_MAX_PER_MINUTE}:10
    retry:
      max_attempts: ${PUSH_RETRY_MAX_ATTEMPTS}:5
    cleanup:
      stale_days: ${PUSH_CLEANUP_STALE_DAYS}:30
  in_app:
    max_notifications_per_user: ${IN_APP_MAX_NOTIFICATIONS_PER_USER}:100
    max_retention_period_days: ${IN_APP_MAX_RETENTION_PERIOD_DAYS}:90
```
