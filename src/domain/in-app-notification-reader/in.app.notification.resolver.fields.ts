import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotification } from './in.app.notification.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';

@Resolver(() => InAppNotification)
export class InAppNotificationResolverFields {
  @ResolveField(() => IContributor, {
    nullable: false,
    description: 'The receiver of the notification.',
  })
  public receiver(@Parent() notification: InAppNotification) {
    // notification.payload.receiverID;
    return null; // todo dataloader
  }

  @ResolveField(() => IContributor, {
    nullable: false,
    description: 'The Contributor who triggered the notification.',
  })
  public triggeredBy(@Parent() notification: InAppNotification) {
    // notification.payload.triggeredByID;
    return null; // todo dataloader
  }
}
