import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { SearchIngestModule } from '@services/api/search/ingest';
import { TaskModule } from '@services/task';
import { AdminSearchIngestResolverMutations } from './admin.search.ingest.resolver.mutations';

@Module({
  imports: [
    SearchIngestModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    TaskModule,
  ],
  providers: [AdminSearchIngestResolverMutations],
  exports: [],
})
export class AdminSearchIngestModule {}
