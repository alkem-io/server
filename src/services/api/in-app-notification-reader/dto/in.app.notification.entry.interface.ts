import { LogContext } from '@common/enums/logging.context';
import { InAppNotificationState } from '@common/enums/in.app.notification.state';
import { Field, InterfaceType } from '@nestjs/graphql';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InAppNotificationEntryCalloutPublished } from './in.app.notification.entry.callout.published';
import { InAppNotificationEntryUserMentioned } from './in.app.notification.entry.user.mentioned';
import { InAppNotificationEntryCommunityNewMember } from './in.app.notification.entry.community.new.member';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

@InterfaceType('InAppNotification', {
  isAbstract: true,
  description: 'An in-app notification type. To not be queried directly',
  resolveType(inAppNotification) {
    switch (inAppNotification.type) {
      case NotificationEvent.SPACE_CALLOUT_PUBLISHED:
        return InAppNotificationEntryCalloutPublished;
      case NotificationEvent.USER_MENTION:
        return InAppNotificationEntryUserMentioned;
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
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

  @Field(() => NotificationEvent, {
    nullable: false,
    description: 'The type of the notification',
  })
  type!: NotificationEvent;

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
