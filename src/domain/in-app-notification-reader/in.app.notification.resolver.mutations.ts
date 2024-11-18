import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InAppNotificationReader } from './in.app.notification.reader';
import { UpdateNotificationStateInput } from './dto/in.app.notification.state.update';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';

@Resolver()
export class InAppNotificationResolverMutations {
  constructor(
    private readonly inAppNotificationReader: InAppNotificationReader
  ) {}

  // @UseGuards(GraphqlGuard) // todo: fix this
  @Mutation(() => InAppNotificationState, {
    description: 'Update notification state and return the notification.',
  })
  async updateNotificationState(
    @Args('notificationData') notificationData: UpdateNotificationStateInput
  ): Promise<InAppNotificationState> {
    await this.inAppNotificationReader.updateNotificationState(
      notificationData.ID,
      notificationData.state
    );

    return notificationData.state;
  }
}
