import { ISearchResult } from './dto/search.result.entry.interface';
import { SearchResultType } from '@common/enums/search.result.type';
import { ISearchResultHub } from './dto/search.result.dto.entry.hub';
import { ISearchResultChallenge } from './dto/search.result.dto.entry.challenge';
import { ISearchResultOpportunity } from './dto/search.result.dto.entry.opportunity';
import { ISearchResultUser } from './dto/search.result.dto.entry.user';
import { ISearchResultOrganization } from './dto/search.result.dto.entry.organization';
import { ISearchResultUserGroup } from './dto/search.result.dto.entry.user.group';

interface SearchResultBuilderFunction<TypedSearchResult> {
  (rawSearchResult: ISearchResult): Promise<TypedSearchResult>;
}

export interface ISearchResultBuilder {
  [SearchResultType.HUB]: SearchResultBuilderFunction<ISearchResultHub>;
  [SearchResultType.CHALLENGE]: SearchResultBuilderFunction<ISearchResultChallenge>;
  [SearchResultType.OPPORTUNITY]: SearchResultBuilderFunction<ISearchResultOpportunity>;
  [SearchResultType.USER]: SearchResultBuilderFunction<ISearchResultUser>;
  [SearchResultType.ORGANIZATION]: SearchResultBuilderFunction<ISearchResultOrganization>;
  [SearchResultType.USERGROUP]: SearchResultBuilderFunction<ISearchResultUserGroup>;
}
