import { LogContext } from '@common/enums/logging.context';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { Field, InterfaceType } from '@nestjs/graphql';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InAppNotificationEntryCalloutPublished } from './in.app.notification.entry.callout.published';
import { InAppNotificationEntryUserMentioned } from './in.app.notification.entry.user.mentioned';
import { InAppNotificationEntryCommunityNewMember } from './in.app.notification.entry.community.new.member';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

@InterfaceType('InAppNotification', {
  isAbstract: true,
  description: 'An in-app notification type. To not be queried directly',
  resolveType(inAppNotification) {
    switch (inAppNotification.type) {
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
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

  @Field(() => NotificationEventInAppState, {
    nullable: false,
    description: 'The current state of the notification',
  })
  state!: NotificationEventInAppState;

  @Field(() => NotificationEventCategory, {
    nullable: false,
    description: 'Which category (role) is this notification targeted to.',
  })
  category!: NotificationEventCategory;

  receiverID!: string;

  payload!: InAppNotificationPayloadBase;
}
