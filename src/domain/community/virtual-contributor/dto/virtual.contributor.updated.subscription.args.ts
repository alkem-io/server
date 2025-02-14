import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class VirtualContributorUpdatedSubscriptionArgs {
  @Field(() => UUID, {
    description: 'The Virtual Contributor to receive the events for.',
    nullable: false,
  })
  virtualContributorID!: string;
}
