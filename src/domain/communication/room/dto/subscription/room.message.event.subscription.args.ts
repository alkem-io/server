import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class RoomMessageEventSubscriptionArgs {
  @Field(() => UUID, {
    description: 'The Room to receive the events from.',
    nullable: false,
  })
  roomID!: string;
}
