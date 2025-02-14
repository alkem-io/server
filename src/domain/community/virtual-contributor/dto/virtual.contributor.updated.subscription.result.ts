import { Field, ObjectType } from '@nestjs/graphql';
import { IVirtualContributor } from '../virtual.contributor.interface';

@ObjectType('VirtualContributorUpdatedSubscriptionResult', {
  description: 'The result from a Virtual Contributor update',
})
export class VirtualContributorUpdatedSubscriptionResult {
  @Field(() => IVirtualContributor, {
    description: 'The Virtual Contributor that was updated',
    nullable: false,
  })
  virtualContributor!: IVirtualContributor;
}
