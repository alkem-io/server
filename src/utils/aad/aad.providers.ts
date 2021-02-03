import { AadAuthenticationClient } from '@cmdbg/tokenator';
import { Provider, Type } from '@nestjs/common';
import { AadIdentityService } from './aad.classes';
import {
  AAD_MODULE_NEST_PROVIDER,
  AAD_MODULE_OPTIONS,
  AAD_MODULE_PROVIDER,
} from './aad.constants';
import {
  AadModuleAsyncOptions,
  AadModuleOptions,
  AadModuleOptionsFactory,
} from './aad.interfaces';
import { createIdentityService } from './identity.service.factory';

export function createNestAadAuthenticationClient(
  aadOptions: AadModuleOptions
): AadAuthenticationClient {
  return createIdentityService(aadOptions);
}

export function createAadProviders(aadOptions: AadModuleOptions): Provider[] {
  return [
    {
      provide: AAD_MODULE_PROVIDER,
      useFactory: () => createIdentityService(aadOptions),
    },
    {
      provide: AAD_MODULE_NEST_PROVIDER,
      useFactory: (aadAuthenticationClient: AadAuthenticationClient) => {
        return new AadIdentityService(aadAuthenticationClient);
      },
      inject: [AAD_MODULE_PROVIDER],
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
        createIdentityService(aadOptions),
      inject: [AAD_MODULE_OPTIONS],
    },
    {
      provide: AAD_MODULE_NEST_PROVIDER,
      useFactory: (aadAuthenticationClient: AadAuthenticationClient) => {
        return new AadIdentityService(aadAuthenticationClient);
      },
      inject: [AAD_MODULE_PROVIDER],
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
