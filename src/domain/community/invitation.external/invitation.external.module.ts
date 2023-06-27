import { InvitationExternal } from '@domain/community/invitation.external/invitation.external.entity';
import { InvitationExternalService } from '@domain/community/invitation.external/invitation.external.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@domain/community/user/user.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InvitationExternalResolverFields } from './invitation.external.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InvitationExternalAuthorizationService } from './invitation.external.service.authorization';
import { InvitationExternalResolverMutations } from './invitation.external.resolver.mutations';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    UserModule,
    TypeOrmModule.forFeature([InvitationExternal]),
  ],
  providers: [
    InvitationExternalService,
    InvitationExternalAuthorizationService,
    InvitationExternalResolverFields,
    InvitationExternalResolverMutations,
  ],
  exports: [
    InvitationExternalService,
    InvitationExternalAuthorizationService,
    InvitationExternalResolverMutations,
  ],
})
export class InvitationExternalModule {}
