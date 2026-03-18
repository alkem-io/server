import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LeaveConversationInput {
  @Field(() => UUID, {
    description: 'The ID of the conversation to leave.',
  })
  conversationID!: string;
}
