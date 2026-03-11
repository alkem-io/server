import { UUID_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { ArgsType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@ArgsType()
export class PollSubscriptionArgs {
  @Field(() => UUID, {
    description: 'The ID of the Poll to subscribe to.',
    nullable: false,
  })
  @MaxLength(UUID_LENGTH)
  pollID!: string;
}
