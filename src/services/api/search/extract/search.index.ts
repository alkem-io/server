import { SearchResultTypes } from '../search.result.types';
import { SearchCategory } from '../search.category';

export type SearchIndex = {
  name: string;
  type: SearchResultTypes;
  category: SearchCategory;
};
