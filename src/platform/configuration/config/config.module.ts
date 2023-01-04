import { Module } from '@nestjs/common';
import { KonfigService } from './config.service';
import { ConfigResolverQueries } from './config.resolver.queries';

@Module({
  providers: [KonfigService, ConfigResolverQueries],
  exports: [KonfigService],
})
export class KonfigModule {}
