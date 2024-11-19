import { Field, InterfaceType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';
import { InAppNotificationCalloutPublished } from './dto/in.app.notification.callout.published';
import { InAppNotificationUserMentioned } from './dto/in.app.notification.user.mentioned';
import { InAppNotificationCommunityNewMember } from './dto/in.app.notification.community.new.member';

@InterfaceType('InAppNotification', {
  isAbstract: true,
  description: 'An in-app notification type. To not be queried directly',
  resolveType(inAppNotification: InAppNotification) {
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
export class InAppNotification {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;
  // todo: graphql enum
  @Field(() => String, {
    nullable: false,
    description: 'The user that triggered this Activity.',
  })
  type!: NotificationEventType;

  @Field(() => Date, {
    nullable: false,
    description: 'When (UTC) was the notification sent.',
  })
  triggeredAt!: Date;
  // todo: graphql enum
  @Field(() => InAppNotificationState, {
    nullable: false,
    description: 'The user that triggered this Activity.',
  })
  state!: InAppNotificationState;
  // todo: graphql enum
  @Field(() => String, {
    nullable: false,
    description: 'The contributor that triggered this notification.',
  })
  category!: string;
  // exposed via the interface field resolver
  triggeredBy?: IContributor;
  receiver?: IContributor;
}
