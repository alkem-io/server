import { SearchResult } from './search-result.dto';

export interface ISearchResultEntry {
  score: number;
  terms: string[];
  result?: typeof SearchResult;
}
