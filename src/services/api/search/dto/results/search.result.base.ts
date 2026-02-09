import { SearchResultType } from '../../search.result.type';
import { BaseSearchHit } from './base.search.hit';
import { ISearchResult } from './search.result.interface';

/**
 * A mixin, providing all the properties of ISearchResult in a class
 * without creating a circular dependency to the concrete classes.
 * @See {@link https://www.typescriptlang.org/docs/handbook/mixins.html}
 * @constructor
 */
export function SearchResultBase() {
  return class implements ISearchResult {
    id!: string;
    score!: number;
    terms!: string[];
    type!: SearchResultType;
    // used to store the result object
    // to not be exposed by the API
    result!: BaseSearchHit;
  };
}
