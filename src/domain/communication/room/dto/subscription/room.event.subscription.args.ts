import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class RoomEventSubscriptionArgs {
  @Field(() => UUID, {
    description: 'The Room to receive the events from.',
    nullable: false,
  })
  roomID!: string;
}
