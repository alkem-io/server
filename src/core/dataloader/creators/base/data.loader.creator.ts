import { ILoader } from '../../loader.interface';
import { DataLoaderCreatorOptions } from './data.loader.creator.options';
import { EntityNotFoundException } from '@common/exceptions';

export interface DataLoaderCreator<TReturn> {
  create(
    options?: DataLoaderCreatorOptions<TReturn>
  ): ILoader<TReturn | null | EntityNotFoundException>;
}
