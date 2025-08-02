import { InAppNotificationPayloadBase } from '@alkemio/notifications-lib';
import { LogContext } from '@common/enums/logging.context';
import { InAppNotificationState } from '@domain/in-app-notification/enums/in.app.notification.state';
import { Field, InterfaceType } from '@nestjs/graphql';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InAppNotificationEntryCalloutPublished } from './in.app.notification.entry.callout.published';
import { InAppNotificationEntryUserMentioned } from './in.app.notification.entry.user.mentioned';
import { InAppNotificationEntryCommunityNewMember } from './in.app.notification.entry.community.new.member';
import { NotificationEventType } from '@domain/in-app-notification/enums/notification.event.type';
import { InAppNotificationCategory } from '@domain/in-app-notification/enums/in.app.notification.category';

@InterfaceType('InAppNotification', {
  isAbstract: true,
  description: 'An in-app notification type. To not be queried directly',
  resolveType(inAppNotification) {
    switch (inAppNotification.type) {
      case NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED:
        return InAppNotificationEntryCalloutPublished;
      case NotificationEventType.COMMUNICATION_USER_MENTION:
        return InAppNotificationEntryUserMentioned;
      case NotificationEventType.COMMUNITY_NEW_MEMBER:
        return InAppNotificationEntryCommunityNewMember;
    }

    throw new BaseException(
      'Unable to determine in-app notification type',
      LogContext.IN_APP_NOTIFICATION,
      AlkemioErrorStatus.FORMAT_NOT_SUPPORTED,
      { id: inAppNotification.id, type: inAppNotification.type }
    );
  },
})
export abstract class IInAppNotificationEntry {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => NotificationEventType, {
    nullable: false,
    description: 'The type of the notification',
  })
  type!: NotificationEventType;

  @Field(() => Date, {
    nullable: false,
    description: 'When (UTC) was the notification sent.',
  })
  triggeredAt!: Date;

  @Field(() => InAppNotificationState, {
    nullable: false,
    description: 'The current state of the notification',
  })
  state!: InAppNotificationState;

  @Field(() => InAppNotificationCategory, {
    nullable: false,
    description: 'Which category (role) is this notification targeted to.',
  })
  category!: InAppNotificationCategory;

  receiverID!: string;

  payload!: InAppNotificationPayloadBase;
}
