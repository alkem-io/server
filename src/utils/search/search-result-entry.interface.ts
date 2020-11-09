import { SearchResult } from './search-result.dto';

export interface ISearchResultEntry {
  score: number;
  result?: typeof SearchResult;
}
