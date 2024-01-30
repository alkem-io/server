import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class LimitAndShuffleQueryArgs {
  @Field(() => Float, {
    description:
      'The number of contributors to return; if omitted return all Entities.',
    nullable: true,
  })
  limit?: number;

  @Field(() => Boolean, {
    description:
      'If true and limit is specified then return a random selection of Entities. Defaults to false.',
    nullable: true,
  })
  shuffle?: boolean;
}
