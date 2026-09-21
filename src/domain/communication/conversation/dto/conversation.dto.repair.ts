import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RepairConversationRoomInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the conversation whose room should be repaired.',
  })
  conversationID!: string;
}
