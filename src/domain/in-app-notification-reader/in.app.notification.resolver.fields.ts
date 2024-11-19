import { Resolver, ResolveField, Parent, Info } from '@nestjs/graphql';
import { InAppNotification } from './in.app.notification.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';

@Resolver(() => InAppNotification)
export class InAppNotificationResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true, // false
  })
  public receiver(
    @Parent() notification: InAppNotification, // Resolved object that implements Character
    @Info() { parentType }: any // Type of the object that implements Character
  ) {
    return null;
  }

  @ResolveField(() => IContributor, {
    nullable: true, // false
  })
  public triggeredBy(
    @Parent() notification: InAppNotification, // Resolved object that implements Character
    @Info() { parentType }: any // Type of the object that implements Character
  ) {
    return null;
  }
}
