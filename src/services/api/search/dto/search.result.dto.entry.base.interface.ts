import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { SearchResultType } from '../search.result.type';

export abstract class ISearchResultBase {
  @Field(() => UUID, {
    nullable: false,
    description: 'The unique identifier for this search result.',
  })
  id!: string;

  @Field(() => Number, {
    nullable: false,
    description:
      'The score for this search result; more matches means a higher score.',
  })
  score!: number;

  @Field(() => [String], {
    nullable: false,
    description: 'The terms that were matched for this result',
  })
  terms!: string[];

  @Field(() => SearchResultType, {
    nullable: false,
  })
  type!: SearchResultType;

  // The actual result
  result!: IBaseAlkemio;
}
