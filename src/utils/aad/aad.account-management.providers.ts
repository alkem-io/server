import { Provider, Type } from '@nestjs/common';
import {
  AAD_GRAPH_MODULE_PROVIDER,
  AAD_ACCOUNT_MANAGEMENT_MODULE_NEST_PROVIDER,
  AAD_ACCOUNT_MANAGEMENT_MODULE_OPTIONS,
  AAD_ACCOUNT_MANAGEMENT_MODULE_PROVIDER,
} from './aad.account-management.constants';
import {
  AadAccountManagementModuleAsyncOptions,
  AadAccountManagementModuleOptions,
  AadAccountManagementModuleOptionsFactory,
} from './aad.account-management.interfaces';
import { AadAccountManagementService } from './aad.account-management.service';
import {
  identityServiceFactory,
  graphServiceFactory,
} from './aad.account-management.service.factories';
import { MsGraphService } from './ms-graph.service';

export function createAadProviders(
  options: AadAccountManagementModuleOptions
): Provider[] {
  return [
    {
      provide: AAD_ACCOUNT_MANAGEMENT_MODULE_PROVIDER,
      useFactory: () => identityServiceFactory(options),
    },
    {
      provide: AAD_GRAPH_MODULE_PROVIDER,
      useFactory: () => graphServiceFactory(),
    },
    {
      provide: AAD_ACCOUNT_MANAGEMENT_MODULE_NEST_PROVIDER,
      useFactory: (graphService: MsGraphService) => {
        return new AadAccountManagementService(graphService);
      },
      inject: [
        AAD_ACCOUNT_MANAGEMENT_MODULE_PROVIDER,
        AAD_GRAPH_MODULE_PROVIDER,
      ],
    },
  ];
}

export function createAadAsyncProviders(
  options: AadAccountManagementModuleAsyncOptions
): Provider[] {
  const providers: Provider[] = [
    {
      provide: AAD_ACCOUNT_MANAGEMENT_MODULE_PROVIDER,
      useFactory: (options: AadAccountManagementModuleOptions) =>
        identityServiceFactory(options),
      inject: [AAD_ACCOUNT_MANAGEMENT_MODULE_OPTIONS],
    },
    {
      provide: AAD_GRAPH_MODULE_PROVIDER,
      useFactory: () => graphServiceFactory(),
    },
    {
      provide: AAD_ACCOUNT_MANAGEMENT_MODULE_NEST_PROVIDER,
      useFactory: (graphService: MsGraphService) => {
        return new AadAccountManagementService(graphService);
      },
      inject: [
        AAD_ACCOUNT_MANAGEMENT_MODULE_PROVIDER,
        AAD_GRAPH_MODULE_PROVIDER,
      ],
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
