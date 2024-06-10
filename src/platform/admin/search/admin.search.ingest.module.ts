import { Module } from '@nestjs/common';
import { SearchIngestModule } from '@services/api/search/v2/ingest';
import { AdminSearchIngestResolverMutations } from '@platform/admin/search/admin.search.ingest.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { TaskModule } from '@services/task';

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
