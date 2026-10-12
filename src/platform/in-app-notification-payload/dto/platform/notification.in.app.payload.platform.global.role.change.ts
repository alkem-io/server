import { RoleChangeType } from '@alkemio/notifications-lib';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType, registerEnumType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadPlatformBase } from './notification.in.app.payload.platform.base';

// Registered here, the one place this GraphQL type is defined, so the
// enum is registered exactly once wherever this file is loaded — a second
// `registerEnumType(RoleChangeType, ...)` call anywhere else in the schema
// is a defect, not a second source of truth.
registerEnumType(RoleChangeType, {
  name: 'RoleChangeType',
  description: 'Whether a role was added or removed.',
});

@ObjectType('InAppNotificationPayloadPlatformGlobalRoleChange', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformGlobalRoleChange extends InAppNotificationPayloadPlatformBase {
  userID!: string;
  roleName!: string;
  // Absent on records written before this field existed; those render with
  // the pre-existing "assigned" wording (no migration rewrites history).
  changeType?: RoleChangeType;
  declare type: NotificationEventPayload.PLATFORM_GLOBAL_ROLE_CHANGE;
}
