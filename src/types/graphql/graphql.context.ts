import { IDataloaders } from '@core/dataloader/dataloader.interface';
import { HttpContext } from '@src/types';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '@core/dataloader/data.loader.inject.token';
import { DataLoaderContextEntry } from '@core/dataloader/interceptors';

declare global {
  interface IGraphQLContext {
    loaders: IDataloaders;
    req: HttpContext['req'];
    [DATA_LOADER_CTX_INJECT_TOKEN]: DataLoaderContextEntry;
    // dataloader creators will also be added here lazily
    // and should not be accessed directly but with the Loader decorator with class ref
  }
}
