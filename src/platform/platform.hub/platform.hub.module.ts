import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { Module } from '@nestjs/common';
import { PlatformHubResolverFields } from './platform.hub.resolver.fields';

@Module({
  imports: [InnovationHubModule],
  providers: [PlatformHubResolverFields],
  exports: [],
})
export class PlatformHubModule {}
