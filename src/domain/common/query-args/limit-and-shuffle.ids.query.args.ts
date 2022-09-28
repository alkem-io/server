import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '../scalars';
import { LimitAndShuffleQueryArgs } from './limit-and-shuffle.query.args';

@ArgsType()
export class LimitAndShuffleIdsQueryArgs extends LimitAndShuffleQueryArgs {
  @Field(() => [UUID], {
    name: 'IDs',
    description: 'The IDs of the entities to return',
    nullable: true,
  })
  IDs?: string[];
}
