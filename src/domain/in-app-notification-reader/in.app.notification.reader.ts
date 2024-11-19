import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InAppNotificationEntity } from '@domain/in-app-notification/in.app.notification.entity';
import { InAppNotificationBuilder } from '@domain/in-app-notification-reader/in.app.notification.builder';
import { InAppNotification } from '@domain/in-app-notification-reader/in.app.notification.interface';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';

// todo: use this service in the controller
@Injectable()
export class InAppNotificationReader {
  constructor(
    @InjectRepository(InAppNotificationEntity)
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>,
    private readonly inAppNotificationBuilder: InAppNotificationBuilder
  ) {}

  public async getNotifications(
    receiverID?: string
  ): Promise<InAppNotification[]> {
    const rawNotifications = await this.getRawNotifications(receiverID);
    return rawNotifications.map(this.mapEntityToGraphQL);
  }

  private mapEntityToGraphQL(
    entity: InAppNotificationEntity
  ): InAppNotification {
    return {
      receiver: {} as any, // to be resolve on demand by a field resolver
      id: entity.id,
      type: entity.type,
      triggeredAt: entity.triggeredAt,
      state: entity.state,
      category: entity.category,
      // receiver and triggeredBy will be resolved by GraphQL field resolver
    };
  }

  private getRawNotifications(
    receiverID?: string
  ): Promise<InAppNotificationEntity[]> {
    return this.inAppNotificationRepo.find({
      where: { receiverID },
      // order: { triggeredAt: 'desc' },
    });
  }

  public async updateNotificationState(
    ID: string,
    state: InAppNotificationState
  ): Promise<InAppNotificationState> {
    const notification = await this.inAppNotificationRepo.findOne({
      where: {
        id: ID!,
      },
    });
    if (!notification) {
      throw new Error('Notification not found');
    }
    notification.state = state;

    const updatedNotification =
      await this.inAppNotificationRepo.save(notification);

    return updatedNotification.state;
  }
}
