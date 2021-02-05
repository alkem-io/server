import { AadAuthenticationClient } from '@cmdbg/tokenator';
import { Provider, Type } from '@nestjs/common';
import { AadIdentityService } from './aad.identity.service';
import {
  AAD_GRAPH_MODULE_PROVIDER,
  AAD_MODULE_NEST_PROVIDER,
  AAD_MODULE_OPTIONS,
  AAD_MODULE_PROVIDER,
} from './aad.constants';
import {
  AadModuleAsyncOptions,
  AadModuleOptions,
  AadModuleOptionsFactory,
} from './aad.interfaces';
import {
  identityServiceFactory,
  graphServiceFactory,
} from './identity.service.factories';
import { MsGraphService } from './ms-graph.service';

export function createAadProviders(aadOptions: AadModuleOptions): Provider[] {
  return [
    {
      provide: AAD_MODULE_PROVIDER,
      useFactory: () => identityServiceFactory(aadOptions),
    },
    {
      provide: AAD_GRAPH_MODULE_PROVIDER,
      useFactory: () => graphServiceFactory(),
    },
    {
      provide: AAD_MODULE_NEST_PROVIDER,
      useFactory: (
        aadAuthenticationClient: AadAuthenticationClient,
        graphService: MsGraphService
      ) => {
        return new AadIdentityService(aadAuthenticationClient, graphService);
      },
      inject: [AAD_MODULE_PROVIDER, AAD_GRAPH_MODULE_PROVIDER],
    },
  ];
}

export function createAadAsyncProviders(
  options: AadModuleAsyncOptions
): Provider[] {
  const providers: Provider[] = [
    {
      provide: AAD_MODULE_PROVIDER,
      useFactory: (aadOptions: AadModuleOptions) =>
        identityServiceFactory(aadOptions),
      inject: [AAD_MODULE_OPTIONS],
    },
    {
      provide: AAD_GRAPH_MODULE_PROVIDER,
      useFactory: () => graphServiceFactory(),
    },
    {
      provide: AAD_MODULE_NEST_PROVIDER,
      useFactory: (
        aadAuthenticationClient: AadAuthenticationClient,
        graphService: MsGraphService
      ) => {
        return new AadIdentityService(aadAuthenticationClient, graphService);
      },
      inject: [AAD_MODULE_PROVIDER, AAD_GRAPH_MODULE_PROVIDER],
    },
  ];

  if (options.useClass) {
    const useClass = options.useClass as Type<AadModuleOptionsFactory>;
    providers.push(
      ...[
        {
          provide: AAD_MODULE_OPTIONS,
          useFactory: async (optionsFactory: AadModuleOptionsFactory) =>
            await optionsFactory.createAadModuleOptions(),
          inject: [useClass],
        },
        {
          provide: useClass,
          useClass,
        },
      ]
    );
  }

  if (options.useFactory) {
    providers.push({
      provide: AAD_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    });
  }

  return providers;
}
