import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
@ObjectType('CreateConversationData')
export class CreateConversationInput {
  @Field(() => [UUID], { nullable: false })
  userIDs!: string[];
}
