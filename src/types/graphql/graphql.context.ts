import { HttpContext } from '@src/types';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '@core/dataloader/data.loader.inject.token';
import { DataLoaderContextEntry } from '@core/dataloader/interceptors';
import { ILoader } from '@core/dataloader/loader.interface';
import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';
import { InnovationHxb } from '@domain/innovation-hub/innovation.hub.entity';

declare global {
  type IGraphQLContext = {
    req: HttpContext['req'];
    [DATA_LOADER_CTX_INJECT_TOKEN]: DataLoaderContextEntry;
    [INNOVATION_HUB_INJECT_TOKEN]: InnovationHxb | undefined;
  } & {
    // dataloader creators will also be added here lazily
    // and should not be accessed directly but with the Loader decorator with class ref
    [key: string]: Promise<ILoader<unknown>> | undefined;
  };
}
