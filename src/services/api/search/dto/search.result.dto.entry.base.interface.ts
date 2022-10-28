import { SearchResultType } from '@common/enums/search.result.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.entry.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';

@ObjectType('SearchResultBase', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultBase implements ISearchResult {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => Number, {
    nullable: true,
    description:
      'The score for this search result; more matches means a higher score.',
  })
  score!: number;

  @Field(() => [String], {
    nullable: true,
    description: 'The terms that were matched for this result',
  })
  terms!: string[];

  @Field(() => SearchResultType, {
    nullable: false,
    description: 'The event type for this Activity.',
  })
  type!: string;

  // The actual result
  result!: IBaseAlkemio;
}
