import { EntityManager, In } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { groupBy } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { Callout } from '@domain/collaboration/callout';
import { Space } from '@domain/space/space/space.entity';
import { User } from '@domain/community/user/user.entity';
import { LogContext } from '@common/enums';
import { Collaboration } from '@domain/collaboration/collaboration';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { getContributorType } from './util/get.contributor.type';
import { InAppNotification } from './in.app.notification.interface';
import { InAppNotificationCalloutPublished } from './dto/in.app.notification.callout.published';
import { InAppNotificationUserMentioned } from './dto/in.app.notification.user.mentioned';
import { InAppNotificationCommunityNewMember } from './dto/in.app.notification.community.new.member';
import { Community } from '@domain/community/community';

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
      .select('space.id', 'spaceId')
      .addSelect('callout.id', 'calloutId')
      .getRawMany<{ spaceId: string; calloutId: string }>();

    if (!result.length) {
      this.logger.warn({
        message: 'Unable to build notifications',
        type: NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED,
        calloutIds,
      });
      return [];
    }

    if (result.length !== calloutIds.length) {
      this.logger.warn({
        message: 'Some notifications were not able to be build',
        type: NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED,
        calloutIds,
      });
    }

    const spaceMap = new Map(result.map(x => [x.calloutId, x.spaceId]));
    const spaceIds = [...spaceMap.values()];
    const spaces = await this.manager.findBy(Space, { id: In(spaceIds) });
    const callouts = await this.manager.findBy(Callout, { id: In(calloutIds) });

    const notifications = data.map<
      InAppNotificationCalloutPublished | undefined
    >(x => {
      const callout = callouts.find(callout => callout.id === x.resourceID);

      if (!callout) {
        this.logger.warn(
          {
            message: 'Unable to find Callout',
            calloutID: x.resourceID,
            notificationID: x.id,
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      const spaceId = spaceMap.get(callout.id);
      const space = spaces.find(space => space.id === spaceId);

      if (!space) {
        this.logger.warn(
          {
            message: 'Unable to find Apace',
            spaceId,
            notificationID: x.id,
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      return {
        ...x,
        space,
        callout,
      };
    });

    return notifications.filter(
      (x): x is InAppNotificationCalloutPublished => !!x
    );
  }

  private async userMentioned(
    data: InAppNotificationOfType<NotificationEventType.COMMUNICATION_USER_MENTION>[]
  ): Promise<InAppNotificationUserMentioned[]> {
    // on a later stage the entity has to be chosen conditionally
    const notifications = data.map(x => {
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
    const joinedContributorIds = data
      .map(x => x.contributorID)
      .filter((x): x is string => !!x);
    // later conditionally choose the entity
    const joinedContributors = await this.manager.findBy(User, {
      id: In(joinedContributorIds),
    });

    const results = await this.manager
      .createQueryBuilder(Space, 'space')
      .leftJoin(Community, 'community', 'community.id = space.communityID')
      .select('space.id', 'spaceId')
      .addSelect('community.id', 'communityId')
      .getRawMany<{ spaceId: string; communityId: string }>();
    const spaces = await this.manager.findBy(Space, {
      id: In(results.map(x => x.spaceId)),
    });

    const spaceMap = new Map(
      results.map(x => [
        x.communityId,
        spaces.find(space => space.id === x.spaceId),
      ])
    );

    const notifications = data.map<
      InAppNotificationCommunityNewMember | undefined
    >(event => {
      if (!event.contributorID) {
        this.logger.warn(
          {
            message: 'The data for Contributor that joined is missing',
            contributorID: event.contributorID,
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      const contributorJoined = joinedContributors.find(
        contributor => contributor.id === event.contributorID
      );

      if (!contributorJoined) {
        this.logger.warn(
          {
            message: 'Unable to find Contributor that joined',
            contributorID: event.contributorID,
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      const contributorType = getContributorType(contributorJoined);

      if (!contributorType) {
        this.logger.warn(
          {
            message: 'Unable to determine contributor type',
            contributorID: contributorJoined.id,
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      if (!event.resourceID) {
        this.logger.warn(
          {
            message:
              'The data for Community that was joined is missing. The code expects a communityID in the resourceID field',
            communityID: event.resourceID,
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      const space = spaceMap.get(event.resourceID);

      if (!space) {
        this.logger.warn(
          {
            message: 'Unable to find Space',
            notificationID: event.id,
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      if (!event.triggeredBy) {
        this.logger.warn(
          {
            message:
              'The data for Contributor that added the Contributor in is missing. It was expected in the triggeredBy field',
          },
          LogContext.IN_APP_NOTIFICATION
        );

        return undefined;
      }

      return {
        ...event,
        triggeredBy: event.triggeredBy,
        contributorType,
        contributorJoined,
        space,
      };
    });

    return notifications.filter(
      (x): x is InAppNotificationCommunityNewMember => !!x
    );
  }

  private async baseNotification(notifications: InAppNotificationEntity[]) {
    // on a later stage the entity has to be chosen conditionally
    const triggeredBys = await this.manager.findBy(User, {
      id: In(notifications.map(notification => notification.triggeredByID)),
    });
    const contributors = await this.manager.findBy(User, {
      id: In(notifications.map(notification => notification.contributorID)),
    });
    // on a later stage the entity has to be chosen conditionally
    const receivers = await this.manager.findBy(User, {
      id: In(notifications.map(notification => notification.receiverID)),
    });

    const allNotifications = notifications.map<InAppNotification | undefined>(
      event => {
        const triggeredBy = triggeredBys.find(
          user => user.id === event.triggeredByID
        );

        if (!triggeredBy && event.triggeredByID) {
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

        const contributor = contributors.find(
          user => user.id === event.contributorID
        );

        if (!contributor && event.contributorID) {
          this.logger.warn(
            {
              message:
                'Unable to find contributor who is the actor in the notification',
              contributorID: event.contributorID,
              inAppNotification: event.id,
            },
            LogContext.IN_APP_NOTIFICATION
          );
        }

        const receiver = receivers.find(user => user.id === event.receiverID);

        if (!receiver) {
          this.logger.warn(
            {
              message:
                'Unable to find contributor who received the notification',
              receiver: event.receiverID,
              inAppNotification: event.id,
            },
            LogContext.IN_APP_NOTIFICATION
          );
          return;
        }

        return {
          id: event.id,
          triggeredAt: event.triggeredAt,
          type: event.type,
          state: event.state,
          category: event.category,
          resourceID: event.resourceID,
          triggeredBy,
          receiver,
          contributor,
        };
      }
    );
    // return only the notifications that were successfully built
    return allNotifications.filter((i): i is InAppNotification => !!i);
  }
}
