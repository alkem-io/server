import { Module } from '@nestjs/common';
import { ConfigurationResolverFields } from './config.resolver.fields';
import { KonfigService } from './config.service';

@Module({
  providers: [KonfigService, ConfigurationResolverFields],
  exports: [KonfigService],
})
export class KonfigModule {}
