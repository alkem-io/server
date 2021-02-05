import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  AadAccountManagementModuleAsyncOptions,
  AadAccountManagementModuleOptions,
} from './aad.account-management.interfaces';
import {
  createAadAsyncProviders,
  createAadProviders,
} from './aad.account-management.providers';

@Global()
@Module({})
export class AadAccountManagementModule {
  public static forRoot(
    options: AadAccountManagementModuleOptions
  ): DynamicModule {
    const providers = createAadProviders(options);

    return {
      module: AadAccountManagementModule,
      providers: providers,
      exports: providers,
    };
  }

  public static forRootAsync(
    options: AadAccountManagementModuleAsyncOptions
  ): DynamicModule {
    const providers = createAadAsyncProviders(options);

    return {
      module: AadAccountManagementModule,
      imports: options.imports,
      providers: providers,
      exports: providers,
    } as DynamicModule;
  }
}
