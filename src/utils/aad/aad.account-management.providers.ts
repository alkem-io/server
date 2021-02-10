import { AadAuthenticationClient } from '@cmdbg/tokenator';
import { Provider, Type } from '@nestjs/common';
import {
  AAD_GRAPH_MODULE_PROVIDER,
  AAD_ACCOUNT_MANAGEMENT_MODULE_NEST_PROVIDER,
  AAD_ACCOUNT_MANAGEMENT_MODULE_OPTIONS,
  AAD_AUTH_CLIENT_PROVIDER,
  AAD_OBO_PROVIDER,
} from './aad.account-management.constants';
import {
  AadAccountManagementModuleAsyncOptions,
  AadAccountManagementModuleOptions,
  AadAccountManagementModuleOptionsFactory,
} from './aad.account-management.interfaces';
import {
  aadAccountManagementServiceFactory,
  aadAuthClientFactory,
  aadOboStrategyFactory,
  graphServiceFactory,
} from './aad.account-management.service.factories';
import { AadOboStrategy } from './aad.obo.strategy';
import { MsGraphService } from './ms-graph.service';

export function createAadProviders(
  options: AadAccountManagementModuleOptions
): Provider[] {
  return [
    {
      provide: AAD_AUTH_CLIENT_PROVIDER,
      useFactory: () => aadAuthClientFactory(options),
    },
    {
      provide: AAD_OBO_PROVIDER,
      useFactory: (authClient: AadAuthenticationClient) =>
        aadOboStrategyFactory(authClient),
      inject: [AAD_AUTH_CLIENT_PROVIDER],
    },
    {
      provide: AAD_GRAPH_MODULE_PROVIDER,
      useFactory: (aadOboStrategy: AadOboStrategy) =>
        graphServiceFactory(aadOboStrategy),
      inject: [AAD_OBO_PROVIDER],
    },
    {
      provide: AAD_ACCOUNT_MANAGEMENT_MODULE_NEST_PROVIDER,
      useFactory: (graphService: MsGraphService) =>
        aadAccountManagementServiceFactory(graphService),
      inject: [AAD_GRAPH_MODULE_PROVIDER],
    },
  ];
}

export function createAadAsyncProviders(
  options: AadAccountManagementModuleAsyncOptions
): Provider[] {
  const providers: Provider[] = [
    {
      provide: AAD_AUTH_CLIENT_PROVIDER,
      useFactory: (options: AadAccountManagementModuleOptions) =>
        aadAuthClientFactory(options),
      inject: [AAD_ACCOUNT_MANAGEMENT_MODULE_OPTIONS],
    },
    {
      provide: AAD_OBO_PROVIDER,
      useFactory: (authClient: AadAuthenticationClient) =>
        aadOboStrategyFactory(authClient),
      inject: [AAD_AUTH_CLIENT_PROVIDER],
    },
    {
      provide: AAD_GRAPH_MODULE_PROVIDER,
      useFactory: (aadOboStrategy: AadOboStrategy) =>
        graphServiceFactory(aadOboStrategy),
      inject: [AAD_OBO_PROVIDER],
    },
    {
      provide: AAD_ACCOUNT_MANAGEMENT_MODULE_NEST_PROVIDER,
      useFactory: (graphService: MsGraphService) =>
        aadAccountManagementServiceFactory(graphService),
      inject: [AAD_GRAPH_MODULE_PROVIDER],
    },
  ];

  if (options.useClass) {
    const useClass = options.useClass as Type<
      AadAccountManagementModuleOptionsFactory
    >;
    providers.push(
      ...[
        {
          provide: AAD_ACCOUNT_MANAGEMENT_MODULE_OPTIONS,
          useFactory: async (
            optionsFactory: AadAccountManagementModuleOptionsFactory
          ) => await optionsFactory.createAadModuleOptions(),
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
      provide: AAD_ACCOUNT_MANAGEMENT_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    });
  }

  return providers;
}
