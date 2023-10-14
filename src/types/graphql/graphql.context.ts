import { HttpContext } from '@src/types/graphql/subscriptions/subscriptionRelatedTypes';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '@core/dataloader/data.loader.inject.token';
import { DataLoaderContextEntry } from '@core/dataloader/interceptors';
import { ILoader } from '@core/dataloader/loader.interface';
import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';

declare global {
  type IGraphQLContext = {
    req: HttpContext['req'];
    [DATA_LOADER_CTX_INJECT_TOKEN]: DataLoaderContextEntry;
    [INNOVATION_HUB_INJECT_TOKEN]: InnovationHub | undefined;
  } & {
    // dataloader creators will also be added here lazily
    // and should not be accessed directly but with the Loader decorator with class ref
    [key: string]: Promise<ILoader<unknown>> | undefined;
  };
}
