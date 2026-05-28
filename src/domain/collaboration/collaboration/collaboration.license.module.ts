import { Callout } from '@domain/collaboration/callout/callout.entity';
import { LicenseModule } from '@domain/common/license/license.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaboration } from './collaboration.entity';
import { CollaborationLicenseService } from './collaboration.service.license';

/**
 * Leaf module that exports `CollaborationLicenseService` without pulling in the rest of
 * `CollaborationModule`. Required so downstream modules (`CalloutsSetModule`,
 * `CalloutModule`, `CalloutContributionModule`) can call the Office Docs entitlement
 * gate without creating a circular dependency back to `CollaborationModule` (which
 * already depends transitively on those modules — constitution principle 2).
 */
@Module({
  imports: [LicenseModule, TypeOrmModule.forFeature([Collaboration, Callout])],
  providers: [CollaborationLicenseService],
  exports: [CollaborationLicenseService],
})
export class CollaborationLicenseModule {}
