import { ISearchResult } from './dto/search.result.entry.interface';
import { SearchResultType } from '@common/enums/search.result.type';
import { ISearchResultSpace } from './dto/search.result.dto.entry.space';
import { ISearchResultChallenge } from './dto/search.result.dto.entry.challenge';
import { ISearchResultOpportunity } from './dto/search.result.dto.entry.opportunity';
import { ISearchResultUser } from './dto/search.result.dto.entry.user';
import { ISearchResultOrganization } from './dto/search.result.dto.entry.organization';
import { ISearchResultUserGroup } from './dto/search.result.dto.entry.user.group';
import { ISearchResultPost } from './dto/search.result.dto.entry.post';

interface SearchResultBuilderFunction<TypedSearchResult> {
  (rawSearchResult: ISearchResult): Promise<TypedSearchResult>;
}

export interface ISearchResultBuilder {
  [SearchResultType.SPACE]: SearchResultBuilderFunction<ISearchResultSpace>;
  [SearchResultType.CHALLENGE]: SearchResultBuilderFunction<ISearchResultChallenge>;
  [SearchResultType.OPPORTUNITY]: SearchResultBuilderFunction<ISearchResultOpportunity>;
  [SearchResultType.USER]: SearchResultBuilderFunction<ISearchResultUser>;
  [SearchResultType.ORGANIZATION]: SearchResultBuilderFunction<ISearchResultOrganization>;
  [SearchResultType.USERGROUP]: SearchResultBuilderFunction<ISearchResultUserGroup>;
  [SearchResultType.POST]: SearchResultBuilderFunction<ISearchResultPost>;
}
