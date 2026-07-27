import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { PlatformResourceAuditModule } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.module';
import { CalloutModule } from '../callout/callout.module';
import { CollaborationLicenseModule } from '../collaboration/collaboration.license.module';
import { CalloutContribution } from './callout.contribution.entity';
import { CalloutContributionModule } from './callout.contribution.module';
import { CalloutContributionMoveResolverMutations } from './callout.contribution.move.resolver.mutations';
import { CalloutContributionMoveService } from './callout.contribution.move.service';

@Module({
  imports: [
    CalloutModule,
    AuthorizationModule,
    CalloutContributionModule,
    CollaborationLicenseModule,
    UrlGeneratorModule,
    PlatformResourceAuditModule,
    TypeOrmModule.forFeature([CalloutContribution, Callout]),
  ],
  providers: [
    CalloutContributionMoveService,
    CalloutContributionMoveResolverMutations,
  ],
  exports: [CalloutContributionMoveService],
})
export class ContributionMoveModule {}
