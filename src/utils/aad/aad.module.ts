import { DynamicModule, Global, Module } from '@nestjs/common';
import { AadModuleAsyncOptions, AadModuleOptions } from './aad.interfaces';
import { createAadAsyncProviders, createAadProviders } from './aad.providers';

@Global()
@Module({})
export class AadModule {
  public static forRoot(options: AadModuleOptions): DynamicModule {
    const providers = createAadProviders(options);

    return {
      module: AadModule,
      providers: providers,
      exports: providers,
    };
  }

  public static forRootAsync(options: AadModuleAsyncOptions): DynamicModule {
    const providers = createAadAsyncProviders(options);

    return {
      module: AadModule,
      imports: options.imports,
      providers: providers,
      exports: providers,
    } as DynamicModule;
  }
}
