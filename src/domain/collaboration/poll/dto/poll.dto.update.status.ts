import { PollStatus } from '@common/enums/poll.status';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsUUID } from 'class-validator';

@InputType('UpdatePollStatusInput')
export class UpdatePollStatusInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Poll to update.',
  })
  @IsUUID()
  pollID!: string;

  @Field(() => PollStatus, {
    nullable: false,
    description: 'The new status for the poll.',
  })
  @IsEnum(PollStatus)
  status!: PollStatus;
}
