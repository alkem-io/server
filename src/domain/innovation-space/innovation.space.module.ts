import { Module } from '@nestjs/common';
import { InnovationSpaceResolverQueries } from './innovation.space.resolver.queries';

@Module({
  imports: [],
  providers: [InnovationSpaceResolverQueries],
})
export class InnovationSpaceModule {}
