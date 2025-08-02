import { Field, InterfaceType } from '@nestjs/graphql';
import { InAppNotificationPayloadBase } from '@alkemio/notifications-lib';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';
import { NotificationEventType } from '@domain/in-app-notification/notification.event.type';
import { InAppNotificationCategory } from '@domain/in-app-notification/in.app.notification.category';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { InAppNotificationCalloutPublished } from '../in-app-notification-reader/dto/in.app.notification.callout.published';
import { InAppNotificationUserMentioned } from '../in-app-notification-reader/dto/in.app.notification.user.mentioned';
import { InAppNotificationCommunityNewMember } from '../in-app-notification-reader/dto/in.app.notification.community.new.member';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';

@InterfaceType('InAppNotification', {
  isAbstract: true,
  description: 'An in-app notification type. To not be queried directly',
  resolveType(inAppNotification: IInAppNotification) {
    switch (inAppNotification.type) {
      case NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED:
        return InAppNotificationCalloutPublished;
      case NotificationEventType.COMMUNICATION_USER_MENTION:
        return InAppNotificationUserMentioned;
      case NotificationEventType.COMMUNITY_NEW_MEMBER:
        return InAppNotificationCommunityNewMember;
    }

    throw new BaseException(
      'Unable to determine in-app notification type',
      LogContext.IN_APP_NOTIFICATION,
      AlkemioErrorStatus.FORMAT_NOT_SUPPORTED,
      { id: inAppNotification.id, type: inAppNotification.type }
    );
  },
})
export class IInAppNotification extends IBaseAlkemio {
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
  // exposed via the interface field resolver
  triggeredBy?: IContributor;
  receiver?: IContributor;
  receiverID!: string;
  //
  payload!: InAppNotificationPayloadBase;
}
