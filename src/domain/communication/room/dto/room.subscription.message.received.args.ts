import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class RoomMessageReceivedArgs {
  @Field(() => UUID, {
    description: 'The Room to receive the messages from.',
    nullable: false,
  })
  roomID!: string;
}
