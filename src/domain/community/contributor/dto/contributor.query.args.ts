import { LimitAndShuffleQueryArgs } from '@domain/common/query-args/limit-and-shuffle.query.args';
import { ContributorFilterInput } from '@domain/community/contributor/dto/contributor.dto.filter';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class ContributorQueryArgs extends LimitAndShuffleQueryArgs {
  @Field(() => ContributorFilterInput, {
    description: 'Filtering criteria for returning results.',
    nullable: true,
  })
  filter?: ContributorFilterInput;
}
