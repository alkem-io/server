import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class ActivityCreatedSubscriptionArgs {
  @Field(() => UUID, {
    nullable: false,
    description: 'The collaboration on which to subscribe for new activity',
  })
  collaborationID!: string;
}
