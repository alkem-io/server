import { SearchResultType } from '../search.result.type';
import { SearchCategory } from '../search.category';

export type SearchIndex = {
  name: string;
  type: SearchResultType;
  category: SearchCategory;
};
