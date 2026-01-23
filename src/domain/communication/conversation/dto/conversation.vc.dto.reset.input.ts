import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ConversationVcResetInput {
  @Field(() => UUID, {
    description: 'The ID of the Conversation to reset.',
  })
  conversationID!: string;
}
