import { Args, Query, Resolver } from '@nestjs/graphql';
import { InAppNotification } from './in.app.notification.interface';
import { InAppNotificationReader } from './in.app.notification.reader';
import { UUID_NAMEID } from '@domain/common/scalars';

@Resolver()
export class InAppNotificationResolverQueries {
  constructor(
    private readonly inAppNotificationReader: InAppNotificationReader
  ) {}
  @Query(() => [InAppNotification], {
    nullable: false,
    description: 'Get all notifications for a receiver.',
  })
  public async notifications(
    @Args('receiverID', { type: () => UUID_NAMEID }) receiverID: string
  ) {
    // todo: some auth
    return this.inAppNotificationReader.getNotifications(receiverID);
  }

  @Query(() => [InAppNotification], {
    nullable: false,
    description: 'Get all notifications for a receiver.',
  })
  public async notificationsAll() {
    // todo: some auth
    return this.inAppNotificationReader.getNotifications();
  }
}
