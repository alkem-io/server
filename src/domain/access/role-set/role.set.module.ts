import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleSet } from './role.set.entity';
import { RoleSetResolverFields } from './role.set.resolver.fields';
import { RoleSetResolverMutations } from './role.set.resolver.mutations';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { FormModule } from '@domain/common/form/form.module';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    LicenseEngineModule,
    FormModule,
    RoleModule,
    InvitationModule,
    ApplicationModule,
    PlatformInvitationModule,
    VirtualContributorModule,
    TypeOrmModule.forFeature([RoleSet]),
  ],
  providers: [
    RoleSetService,
    RoleSetAuthorizationService,
    RoleSetResolverMutations,
    RoleSetResolverFields,
  ],
  exports: [RoleSetService, RoleSetAuthorizationService],
})
export class RoleSetModule {}
