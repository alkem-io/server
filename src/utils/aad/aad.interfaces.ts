import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Type } from '@nestjs/common';
import { AuthConfig } from '@cmdbg/tokenator';

export type AadModuleOptions = AuthConfig;

export interface AadModuleOptionsFactory {
  createAadModuleOptions(): Promise<AadModuleOptions> | AadModuleOptions;
}

export interface AadModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<AadModuleOptions> | AadModuleOptions;
  inject?: any[];
  useClass?: Type<AadModuleOptionsFactory>;
}
