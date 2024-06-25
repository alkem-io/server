import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class WhiteboardSavedSubscriptionArgs {
  @Field(() => UUID, {
    description: 'The Whiteboard to receive the save events from.',
    nullable: false,
  })
  whiteboardID!: string;
}
