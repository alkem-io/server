import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UrlResolverService } from './url.resolver.service';
import { UrlResolverResolverQueries } from './url.resolver.resolver.queries';

@Module({
  imports: [AuthorizationModule],
  providers: [UrlResolverService, UrlResolverResolverQueries],
  exports: [],
})
export class UrlResolverModule {}
