import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateConversationInput } from '@domain/communication/conversation/dto/conversation.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateConversationOnConversationsSetInput extends CreateConversationInput {
  @Field(() => UUID, { nullable: false })
  conversationsSetID!: string;
}
