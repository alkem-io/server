import { DataLoaderCreatorBaseOptions } from './data.loader.creator.base.options';

export interface DataLoaderCreatorPaginationOptions<TResult>
  extends DataLoaderCreatorBaseOptions<TResult> {
  /***
   * A pivot cursor after which items are selected
   */
  after?: string;
  /***
   * Amount of items after the cursor
   */
  first?: number;
  /***
   * A pivot cursor before which items are selected
   */
  before?: string;
  /***
   * Amount of items before the cursor
   */
  last?: number;
}
