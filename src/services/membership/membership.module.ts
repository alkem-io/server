import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { MembershipService } from './membership.service';
import { MembershipResolverQueries } from './membership.resolver.queries';
import { CommunityModule } from '@domain/community/community/community.module';

@Module({
  imports: [
    UserModule,
    UserGroupModule,
    CommunityModule,
    OrganisationModule,
    EcoverseModule,
  ],
  providers: [MembershipService, MembershipResolverQueries],
  exports: [MembershipService],
})
export class MembershipModule {}
