import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { SpaceAboutModule } from '@domain/space/space.about/space.about.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateContentSpace } from './template.content.space.entity';
import { TemplateContentSpaceResolverFields } from './template.content.space.resolver.fields';
import { TemplateContentSpaceResolverMutations } from './template.content.space.resolver.mutations';
import { TemplateContentSpaceService } from './template.content.space.service';
import { TemplateContentSpaceAuthorizationService } from './template.content.space.service.authorization';
import { TemplateContentSpaceLicenseService } from './template.content.space.service.license';

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
