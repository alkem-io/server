import { HttpContext } from '@src/types';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '@core/dataloader/data.loader.inject.token';
import { DataLoaderContextEntry } from '@core/dataloader/interceptors';
import { ILoader } from '@core/dataloader/loader.interface';

declare global {
  type IGraphQLContext = {
    req: HttpContext['req'];
    [DATA_LOADER_CTX_INJECT_TOKEN]: DataLoaderContextEntry;
  } & {
    // dataloader creators will also be added here lazily
    // and should not be accessed directly but with the Loader decorator with class ref
    [key: string]: Promise<ILoader<unknown>>;
  };
}
