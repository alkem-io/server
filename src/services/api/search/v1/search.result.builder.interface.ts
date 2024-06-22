import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { SearchResultType } from '@common/enums/search.result.type';
import { ISearchResultSpace } from '@services/api/search/dto/search.result.dto.entry.space';
import { ISearchResultChallenge } from '@services/api/search/dto/search.result.dto.entry.challenge';
import { ISearchResultOpportunity } from '@services/api/search/dto/search.result.dto.entry.opportunity';
import { ISearchResultUser } from '@services/api/search/dto/search.result.dto.entry.user';
import { ISearchResultOrganization } from '@services/api/search/dto/search.result.dto.entry.organization';
import { ISearchResultUserGroup } from '@services/api/search/dto/search.result.dto.entry.user.group';
import { ISearchResultPost } from '@services/api/search/dto/search.result.dto.entry.post';
import { ISearchResultCallout } from '@services/api/search/dto/search.result.dto.entry.callout';

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
  [SearchResultType.CALLOUT]: SearchResultBuilderFunction<ISearchResultCallout>;
}
