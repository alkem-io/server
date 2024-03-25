import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Callout } from '@domain/collaboration/callout';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CalloutContribution } from './callout.contribution.entity';
import { CalloutModule } from '../callout/callout.module';
import { CalloutContributionMoveService } from './callout.contribution.move.service';
import { CalloutContributionMoveResolverMutations } from './callout.contribution.move.resolver.mutations';
import { CalloutContributionModule } from './callout.contribution.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';

@Module({
  imports: [
    CalloutModule,
    AuthorizationModule,
    EntityResolverModule,
    CalloutContributionModule,
    UrlGeneratorModule,
    TypeOrmModule.forFeature([CalloutContribution, Callout]),
  ],
  providers: [
    CalloutContributionMoveService,
    CalloutContributionMoveResolverMutations,
  ],
  exports: [CalloutContributionMoveService],
})
export class ContributionMoveModule {}
