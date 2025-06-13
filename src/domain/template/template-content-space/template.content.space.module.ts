import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { TemplateContentSpace } from './template.content.space.entity';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceAboutModule } from '@domain/space/space.about/space.about.module';
import { TemplateContentSpaceService } from './template.content.space.service';
import { TemplateContentSpaceAuthorizationService } from './template.content.space.service.authorization';
import { TemplateContentSpaceLicenseService } from './template.content.space.service.license';
import { TemplateContentSpaceResolverFields } from './template.content.space.resolver.fields';
import { TemplateContentSpaceResolverMutations } from './template.content.space.resolver.mutations';
import { LicenseModule } from '@domain/common/license/license.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    SpaceAboutModule,
    CollaborationModule,
    LicenseModule,
    TypeOrmModule.forFeature([TemplateContentSpace]),
  ],
  providers: [
    TemplateContentSpaceService,
    TemplateContentSpaceAuthorizationService,
    TemplateContentSpaceLicenseService,
    TemplateContentSpaceResolverFields,
    TemplateContentSpaceResolverMutations,
  ],
  exports: [
    TemplateContentSpaceService,
    TemplateContentSpaceAuthorizationService,
    TemplateContentSpaceLicenseService,
  ],
})
export class TemplateContentSpaceModule {}
