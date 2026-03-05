import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { ArrayMinSize, IsUUID } from 'class-validator';

@InputType('CastPollVoteInput')
export class CastPollVoteInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Poll to vote on.',
  })
  @IsUUID()
  pollID!: string;

  @Field(() => [UUID], {
    nullable: false,
    description:
      'The complete set of selected PollOption IDs. When updating an existing vote, the entire selection set must be provided. Count must be ≥ poll.minResponses and ≤ poll.maxResponses (0 = unlimited). All IDs must belong to the specified poll.',
  })
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  selectedOptionIDs!: string[];
}
