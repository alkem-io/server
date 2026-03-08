import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignConversationMemberInput {
  @Field(() => UUID, {
    description: 'The ID of the conversation to add a member to.',
  })
  conversationID!: string;

  @Field(() => UUID, {
    description: 'The ID of the member (user or VC) to add.',
  })
  memberID!: string;
}
