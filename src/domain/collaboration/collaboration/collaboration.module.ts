import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { CollaborationResolverFields } from '@domain/collaboration/collaboration/collaboration.resolver.fields';
import { CollaborationAuthorizationService } from './collaboration.service.authorization';
import { TimelineModule } from '@domain/timeline/timeline/timeline.module';
import { InnovationFlowModule } from '../innovation-flow/innovation.flow.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { CollaborationLicenseService } from './collaboration.service.license';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoleSetModule,
    TimelineModule,
    InnovationFlowModule,
    LicenseModule,
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
