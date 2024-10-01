import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { Invitation } from '@domain/access/invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@domain/community/user/user.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InvitationResolverFields } from './invitation.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InvitationAuthorizationService } from './invitation.service.authorization';
import { InvitationResolverMutations } from './invitation.resolver.mutations';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    LifecycleModule,
    UserModule,
    ContributorModule,
    VirtualContributorModule,
    TypeOrmModule.forFeature([Invitation]),
  ],
  providers: [
    InvitationService,
    InvitationAuthorizationService,
    InvitationResolverFields,
    InvitationResolverMutations,
  ],
  exports: [
    InvitationService,
    InvitationAuthorizationService,
    InvitationResolverMutations,
  ],
})
export class InvitationModule {}
