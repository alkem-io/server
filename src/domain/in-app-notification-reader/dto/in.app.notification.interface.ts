import { Field, InterfaceType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { InAppNotificationCalloutPublished } from '@domain/in-app-notification-reader/dto/in.app.notification.callout.published';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { InAppNotificationUserMentioned } from '@domain/in-app-notification-reader/dto/in.app.notification.user.mentioned';
import { InAppNotificationCommunityNewMember } from '@domain/in-app-notification-reader/dto/in.app.notification.community.new.member';
import { BaseException } from '@common/exceptions/base.exception';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';

@InterfaceType('InAppNotification', {
  isAbstract: true,
  description: 'An in-app notification type. To not be queried directly',
  resolveType(inAppNotification: InAppNotification) {
    // todo type
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

  @Field(() => Number, {
    nullable: false,
    description: 'When (UTC) was the action triggered.',
  })
  triggeredAt!: number;
  // todo: graphql enum
  @Field(() => String, {
    nullable: false,
    description: 'The user that triggered this Activity.',
  })
  type!: NotificationEventType;
  // todo: graphql enum
  @Field(() => InAppNotificationState, {
    nullable: false,
    description: 'The user that triggered this Activity.',
  })
  state!: InAppNotificationState;

  @Field(() => IContributor, {
    nullable: false,
    description: 'The contributor that triggered this notification.',
  })
  triggeredBy!: IContributor;
  // todo: graphql enum
  @Field(() => String, {
    nullable: false,
    description: 'The contributor that triggered this notification.',
  })
  category!: string;

  @Field(() => IContributor, {
    nullable: false,
    description: 'The contributor that should receive this notification.',
  })
  receiver!: IContributor;
  // the type of the resource to be resolved in the concrete class
  resourceID!: string;
}
