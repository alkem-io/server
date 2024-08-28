import { ArgsType, Field } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';

@ArgsType()
export class VirtualContributorUpdatedSubscriptionArgs {
  @Field(() => UUID_NAMEID, {
    description: 'The Virtual Contributor to receive the events for.',
    nullable: false,
  })
  virtualContributorID!: string;
}
