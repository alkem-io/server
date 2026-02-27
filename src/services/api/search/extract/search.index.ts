import { SearchCategory } from '../search.category';
import { SearchResultType } from '../search.result.type';

export type SearchIndex = {
  name: string;
  type: SearchResultType;
  category: SearchCategory;
};
