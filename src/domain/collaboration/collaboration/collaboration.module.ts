import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformRolesAccessModule } from '@domain/access/platform-roles-access/platform.roles.access.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { CollaborationResolverFields } from '@domain/collaboration/collaboration/collaboration.resolver.fields';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { TimelineModule } from '@domain/timeline/timeline/timeline.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CalloutsSetModule } from '../callouts-set/callouts.set.module';
import { InnovationFlowModule } from '../innovation-flow/innovation.flow.module';
import { CollaborationAuthorizationService } from './collaboration.service.authorization';
import { CollaborationLicenseService } from './collaboration.service.license';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoleSetModule,
    TimelineModule,
    InnovationFlowModule,
    LicenseModule,
    CalloutsSetModule,
    PlatformRolesAccessModule,
    NamingModule,
    TypeOrmModule.forFeature([Collaboration]),
  ],
  providers: [
    CollaborationService,
    CollaborationAuthorizationService,
    CollaborationResolverFields,
    CollaborationLicenseService,
  ],
  exports: [
    CollaborationService,
    CollaborationAuthorizationService,
    CollaborationLicenseService,
  ],
})
export class CollaborationModule {}
