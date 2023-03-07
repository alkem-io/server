import { ILoader } from '../../loader.interface';
import { DataLoaderCreatorOptions } from './data.loader.creator.options';

export interface DataLoaderCreator<TReturn> {
  create(options?: DataLoaderCreatorOptions): ILoader<TReturn>;
}
