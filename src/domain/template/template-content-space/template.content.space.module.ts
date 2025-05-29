import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { LicensingCredentialBasedModule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.module';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { SpaceSettingsModule } from '@domain/space/space.settings/space.settings.module';
import { TemplateContentSpace } from './template.content.space.entity';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceAboutModule } from '@domain/space/space.about/space.about.module';
import { TemplateContentSpaceService } from './template.content.space.service';
import { TemplateContentSpaceAuthorizationService } from './template.content.space.service.authorization';
import { TemplateContentSpaceLicenseService } from './template.content.space.service.license';
import { TemplateContentSpaceResolverFields } from './template.content.space.resolver.fields';
import { TemplateContentSpaceResolverMutations } from './template.content.space.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    SpaceAboutModule,
    CommunityModule,
    ProfileModule,
    LicensingFrameworkModule,
    LicenseIssuerModule,
    LicensingCredentialBasedModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    SpaceSettingsModule,
    CollaborationModule,
    InputCreatorModule,
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
