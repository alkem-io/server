import { IDataloaders } from './dataloader.interface';

export type ILazyDataloaders = {
  [P in keyof IDataloaders]: () => IDataloaders[P];
};
