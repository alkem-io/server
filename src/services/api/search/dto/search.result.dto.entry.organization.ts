import { IOrganization } from '@domain/community/organization/organization.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultOrganization', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultOrganization
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => IOrganization, {
    nullable: false,
    description: 'The Organization that was found.',
  })
  organization!: IOrganization;
}
