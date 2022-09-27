import { ContributorFilterInput } from '@domain/community/contributor/dto/contributor.dto.filter';
import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class ContributorQueryArgs {
  @Field(() => Float, {
    name: 'limit',
    description:
      'The number of contributors to return; if omitted return all Contributors.',
    nullable: true,
  })
  limit?: number;

  @Field(() => Boolean, {
    name: 'shuffle',
    description:
      'If true and limit is specified then return a random selection of Contributors. Defaults to false.',
    nullable: true,
  })
  shuffle?: boolean;

  @Field(() => ContributorFilterInput, {
    name: 'filter',
    description: 'Filtering criteria for returning results.',
    nullable: true,
  })
  filter?: ContributorFilterInput;
}
