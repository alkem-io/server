import DataLoader from 'dataloader';

export interface DataLoaderCreator<TReturn, TKey = string> {
  create(): DataLoader<TKey, TReturn>;
}
