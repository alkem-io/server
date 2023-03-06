import { ILoader } from '../../loader.interface';
import { DataLoaderCreatorOptions } from '@core/dataloader/creators/base/data.loader.creator.options';

export interface DataLoaderCreator<TReturn> {
  create(options?: DataLoaderCreatorOptions): ILoader<TReturn>;
}
