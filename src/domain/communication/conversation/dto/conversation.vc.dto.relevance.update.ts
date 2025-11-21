import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ConversationVcAnswerRelevanceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the conversation.',
  })
  conversationID!: string;

  // Message id is not a UUID, it's the id of the message in Matrix
  @Field(() => String, {
    nullable: false,
    description: 'The answer id.',
  })
  id!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Is the answer relevant or not.',
  })
  relevant!: boolean;
}
