import { Module } from '@nestjs/common';
import { AdminSearchIngestResult } from './admin.search.ingest.result';
import { SearchIngestModule } from '@services/api/search2/search.ingest/search.ingest.module';
import { AdminSearchIngestResolverMutations } from '@platform/admin/search/admin.search.ingest.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';

@Module({
  imports: [
    SearchIngestModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [AdminSearchIngestResult, AdminSearchIngestResolverMutations],
  exports: [],
})
export class AdminSearchIngestModule {}
