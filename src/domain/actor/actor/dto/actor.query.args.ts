import { LimitAndShuffleQueryArgs } from '@domain/common/query-args/limit-and-shuffle.query.args';
import { ActorFilterInput } from '@domain/actor/actor/dto/actor.dto.filter';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class ActorQueryArgs extends LimitAndShuffleQueryArgs {
  @Field(() => ActorFilterInput, {
    description: 'Filtering criteria for returning results.',
    nullable: true,
  })
  filter?: ActorFilterInput;
}
