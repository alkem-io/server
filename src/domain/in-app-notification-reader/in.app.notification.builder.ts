import { EntityManager, In } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Callout } from '@domain/collaboration/callout';
import { Space } from '@domain/space/space/space.entity';
import { InAppNotificationEntity } from './in.app.notification.entity';
import { InAppNotificationCalloutPublished } from '@domain/in-app-notification-reader/dto/in.app.notification.callout.published';
import { User } from '@domain/community/user/user.entity';
import { InAppNotification } from '@domain/in-app-notification-reader/dto/in.app.notification.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { groupBy } from 'lodash';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { InAppNotificationUserMentioned } from '@domain/in-app-notification-reader/dto/in.app.notification.user.mentioned';
import { InAppNotificationCommunityNewMember } from '@domain/in-app-notification-reader/dto/in.app.notification.community.new.member';
import { Collaboration } from '@domain/collaboration/collaboration';
import { getContributorType } from '@domain/in-app-notification-reader/util/get.contributor.type';

type NotificationTypeMap = {
  [K in NotificationEventType]: InAppNotification & { type: K };
};

type InAppNotificationOfType<T extends NotificationEventType> =
  InAppNotification & {
    type: T;
  };

// todo: think about visitor pattern instead of a builder
@Injectable()
export class InAppNotificationBuilder {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async build(
    data: InAppNotificationEntity[]
  ): Promise<InAppNotification[]> {
    const baseNotifications = await this.baseNotification(data);
    const groups = groupBy(baseNotifications, 'type') as {
      [K in NotificationEventType]?: NotificationTypeMap[K][];
    };
    // todo: visitor pattern, instead of using logic to determine the proper builder for the type
    const promises = await Promise.all([
      await this.calloutPublished(groups.collaborationCalloutPublished ?? []),
      await this.userMentioned(groups.communicationUserMention ?? []),
      await this.communityNewMember(groups.communityNewMember ?? []),
    ]);

    return promises.flat(1);
  }

  private async calloutPublished(
    data: InAppNotificationOfType<NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED>[]
  ): Promise<InAppNotificationCalloutPublished[]> {
    const calloutIds = data.map(event => event.resourceID);

    // const callouts = await this.manager.find(Callout, {
    //   where: { id: In(calloutIds) },
    // });

    const result = await this.manager
      .createQueryBuilder(Space, 'space')
      .leftJoin(
        Collaboration,
        'collaboration',
        'collaboration.id = space.collaborationID'
      )
      .leftJoin(
        Callout,
        'callout',
        'callout.collaborationID = collaboration.id'
      )
      .where('callout.id IN (:calloutIds)', { calloutIds })
      .select(['space.id', 'spaceId'])
      .addSelect(['callout.id', 'calloutId'])
      .getRawMany<{ spaceId: string; calloutId: string }>();

    return [] as any;
  }

  private async userMentioned(
    data: InAppNotificationOfType<NotificationEventType.COMMUNICATION_USER_MENTION>[]
  ): Promise<InAppNotificationUserMentioned[]> {
    // on a later stage the entity has to be chosen conditionally
    const notifications = data.map<InAppNotificationUserMentioned>(x => {
      const contributorType = getContributorType(x.receiver);

      if (!contributorType) {
        this.logger.warn(
          {
            message: 'Unable to determine contributor type',
            contributorID: x.receiver.id,
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      return {
        ...x,
        contributorType,
      };
    });

    return notifications.filter(
      (i): i is InAppNotificationUserMentioned => !!i
    );
  }
  // todo: implement; cannot figure out the fields
  private async communityNewMember(
    data: InAppNotificationOfType<NotificationEventType.COMMUNITY_NEW_MEMBER>[]
  ): Promise<InAppNotificationCommunityNewMember[]> {
    // const notifications = data.map<InAppNotificationCommunityNewMember>(x => {
    //   const contributorType = getContributorType(x.triggeredBy);
    //
    //   if (!contributorType) {
    //     this.logger.warn(
    //       {
    //         message: 'Unable to determine contributor type',
    //         contributorID: x.receiver.id,
    //       },
    //       LogContext.IN_APP_NOTIFICATION
    //     );
    //
    //     return undefined;
    //   }
    //
    //   return {
    //     ...x,
    //     contributorType,
    //   };
    // }

    return [];
  }

  private async baseNotification(notifications: InAppNotificationEntity[]) {
    // on a later stage the entity has to be chosen conditionally
    const triggeredBys = await this.manager.findBy(User, {
      id: In(notifications.map(notification => notification.triggeredByID)),
    });
    // on a later stage the entity has to be chosen conditionally
    const receivers = await this.manager.findBy(User, {
      id: In(notifications.map(notification => notification.receiverID)),
    });

    const allNotifications = notifications.map(event => {
      const triggeredBy = triggeredBys.find(
        user => user.id === event.triggeredByID
      );

      if (!triggeredBy) {
        this.logger.warn(
          {
            message:
              'Unable to find contributor who triggered the notification',
            triggeredBy: event.triggeredByID,
            inAppNotification: event.id,
          },
          LogContext.IN_APP_NOTIFICATION
        );
        return;
      }

      const receiver = receivers.find(user => user.id === event.receiverID);

      if (!receiver) {
        this.logger.warn(
          {
            message: 'Unable to find contributor who received the notification',
            receiver: event.receiverID,
            inAppNotification: event.id,
          },
          LogContext.IN_APP_NOTIFICATION
        );
        return;
      }

      const notification = new InAppNotification();
      notification.triggeredAt = event.triggeredAt;
      notification.type = event.type;
      notification.state = event.state;
      notification.category = event.category;
      notification.resourceID = event.resourceID;
      notification.triggeredBy = triggeredBy;
      notification.receiver = receiver;
      return notification;
    });
    // return only the notifications that were successfully built
    return allNotifications.filter((i): i is InAppNotification => !!i);
  }
}
