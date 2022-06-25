import { IDataloaders } from '@core/dataloader/dataloader.interface';

declare global {
  interface IGraphQLContext {
    loaders: IDataloaders;
  }
}
