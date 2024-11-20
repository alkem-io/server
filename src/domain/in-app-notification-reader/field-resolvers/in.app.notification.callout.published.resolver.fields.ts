import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationCalloutPublished } from '@domain/in-app-notification-reader/dto/in.app.notification.callout.published';
import { ISpace } from '@domain/space/space/space.interface';
import { ICallout } from '@domain/collaboration/callout';

@Resolver(() => InAppNotificationCalloutPublished)
export class InAppNotificationCalloutPublishedResolverFields {
  @ResolveField(() => ICallout, {
    nullable: false,
    description: 'The Callout that was published.',
  })
  public callout(@Parent() notification: InAppNotification) {
    return null; // todo dataloader
  }

  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'Where the callout is located.',
  })
  public space(@Parent() notification: InAppNotification) {
    return null; // todo dataloader
  }
}
