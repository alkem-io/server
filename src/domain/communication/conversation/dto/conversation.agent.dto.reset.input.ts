import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ConversationAgentResetInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the conversation.',
  })
  conversationID!: string;
}
