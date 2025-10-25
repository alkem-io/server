import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';

@InputType()
@ObjectType('CreateConversationData')
export class CreateConversationInput {
  @Field(() => [UUID], { nullable: false })
  userIDs!: string[];

  @Field(() => CommunicationConversationType, { nullable: false })
  type!: CommunicationConversationType;
}
