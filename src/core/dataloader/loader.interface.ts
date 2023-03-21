import DataLoader from 'dataloader';

export type ILoader<TReturn> = DataLoader<string, TReturn>;
