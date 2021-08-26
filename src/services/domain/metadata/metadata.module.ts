import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { MetadataResolverQueries } from './metadata.resolver.queries';
import { MetadataService } from './metadata.service';

@Module({
  imports: [
    UserModule,
    ChallengeModule,
    EcoverseModule,
    OpportunityModule,
    OrganisationModule,
  ],
  providers: [MetadataResolverQueries, MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
