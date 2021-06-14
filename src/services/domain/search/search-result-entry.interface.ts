import { ISearchable } from '@domain/common/interfaces';
export interface ISearchResultEntry {
  score: number;
  terms: string[];
  result?: ISearchable;
}
