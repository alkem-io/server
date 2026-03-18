import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveConversationMemberInput {
  @Field(() => UUID, {
    description: 'The ID of the conversation to remove a member from.',
  })
  conversationID!: string;

  @Field(() => UUID, {
    description: 'The ID of the member (user or VC) to remove.',
  })
  memberID!: string;
}
