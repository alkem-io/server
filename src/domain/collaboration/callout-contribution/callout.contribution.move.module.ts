import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { CalloutModule } from '../callout/callout.module';
import { CalloutContributionModule } from './callout.contribution.module';
import { CalloutContributionMoveResolverMutations } from './callout.contribution.move.resolver.mutations';
import { CalloutContributionMoveService } from './callout.contribution.move.service';

@Module({
  imports: [
    CalloutModule,
    AuthorizationModule,
    CalloutContributionModule,
    UrlGeneratorModule,
  ],
  providers: [
    CalloutContributionMoveService,
    CalloutContributionMoveResolverMutations,
  ],
  exports: [CalloutContributionMoveService],
})
export class ContributionMoveModule {}
