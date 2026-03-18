import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType('RemovePollVoteInput')
export class RemovePollVoteInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The ID of the Poll from which to remove the current user vote.',
  })
  @IsUUID()
  pollID!: string;
}
