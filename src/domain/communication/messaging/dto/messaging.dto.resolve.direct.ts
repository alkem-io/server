import { CONVERSATION_GROUP_MEMBER_COUNT_MAX } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

@InputType()
export class ResolveDirectConversationsInput {
  @Field(() => [UUID], {
    nullable: false,
    description: `Actor IDs of the recipients to resolve a direct conversation with (1..${CONVERSATION_GROUP_MEMBER_COUNT_MAX}). Duplicates and the caller are dropped.`,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(CONVERSATION_GROUP_MEMBER_COUNT_MAX)
  @IsUUID('4', { each: true })
  memberIDs!: string[];
}
