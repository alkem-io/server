import { Module } from '@nestjs/common';
import { PlatformHubResolverFields } from './platform.hub.resolver.fields';
import { InnovationHubModule } from '@domain/innovation-hub';

@Module({
  imports: [InnovationHubModule],
  providers: [PlatformHubResolverFields],
  exports: [],
})
export class PlatformHubModule {}
