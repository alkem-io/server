import { Module } from '@nestjs/common';
import { TrustRegistryConfigurationAdapter } from './trust.registry.configuration.adapter';

@Module({
  providers: [TrustRegistryConfigurationAdapter],
  exports: [TrustRegistryConfigurationAdapter],
})
export class TrustRegistryConfigurationModule {}
