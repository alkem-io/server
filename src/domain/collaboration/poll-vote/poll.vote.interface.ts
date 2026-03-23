import { IPollOption } from '@domain/collaboration/poll-option/poll.option.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';
import { IPoll } from '../poll/poll.interface';

@ObjectType('PollVote')
export abstract class IPollVote extends IBaseAlkemio {
  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the user who cast this vote.',
  })
  createdBy!: string;

  @Field(() => [IPollOption], {
    nullable: false,
    description: 'The options selected in this vote.',
  })
  selectedOptions?: IPollOption[];

  // Internal — not exposed via GraphQL
  selectedOptionIds!: string[];
  poll?: IPoll;
}
