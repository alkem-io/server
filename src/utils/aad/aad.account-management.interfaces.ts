import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Type } from '@nestjs/common';
import { AuthConfig } from '@cmdbg/tokenator';

export type AadAccountManagementModuleOptions = AuthConfig;

export interface AadAccountManagementModuleOptionsFactory {
  createAadModuleOptions():
    | Promise<AadAccountManagementModuleOptions>
    | AadAccountManagementModuleOptions;
}

export interface AadAccountManagementModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) =>
    | Promise<AadAccountManagementModuleOptions>
    | AadAccountManagementModuleOptions;
  inject?: any[];
  useClass?: Type<AadAccountManagementModuleOptionsFactory>;
}
