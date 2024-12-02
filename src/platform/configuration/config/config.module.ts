import { Module } from '@nestjs/common';
import { KonfigService } from './config.service';
import { ConfigurationResolverFields } from './config.resolver.fields';

@Module({
  providers: [KonfigService, ConfigurationResolverFields],
  exports: [KonfigService],
})
export class KonfigModule {}
