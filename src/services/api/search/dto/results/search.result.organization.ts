import { IOrganization } from '@domain/community/organization/organization.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.interface';
import { SearchResultBase } from './search.result.base';

@ObjectType('SearchResultOrganization', {
  implements: () => ISearchResult,
})
export abstract class ISearchResultOrganization extends SearchResultBase() {
  @Field(() => IOrganization, {
    nullable: false,
    description: 'The Organization that was found.',
  })
  organization!: IOrganization;
}
