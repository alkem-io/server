import DataLoader from 'dataloader';

export interface IDataLoader<TKey, TReturn> {
  create(): DataLoader<TKey, TReturn>;
}
