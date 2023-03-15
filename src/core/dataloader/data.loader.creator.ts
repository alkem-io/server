import { ILoader } from './loader.interface';

export interface DataLoaderCreator<TReturn> {
  create(): ILoader<TReturn>;
}
