import {
  InAppNotificationCategory,
  InAppNotificationPayloadBase,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';

/**
 * A mixin, providing all the properties of InAppNotification in a class
 * without creating a circular dependency to the concrete classes.
 * @See {@link https://www.typescriptlang.org/docs/handbook/mixins.html}
 * @constructor
 */
export abstract class IInAppNotificationEntryBase {
  // resolved by the interface resolvers
  id!: string;
  type!: NotificationEventType;
  triggeredAt!: Date;
  state!: InAppNotificationState;
  category!: InAppNotificationCategory;
  payload!: InAppNotificationPayloadBase;
}
