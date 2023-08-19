import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { SpaceModule } from '@domain/challenge/space/space.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { MetadataService } from './metadata.service';

@Module({
  imports: [
    UserModule,
    ChallengeModule,
    SpaceModule,
    OpportunityModule,
    OrganizationModule,
  ],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
