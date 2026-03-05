import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '../elasticsearch-client';
import { ContributionReporterService } from './contribution.reporter.service';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [
    ActorModule,
    UserLookupModule
  ],
  providers: [ContributionReporterService, ElasticsearchClientProvider],
  exports: [ContributionReporterService],
})
export class ContributionReporterModule {}
