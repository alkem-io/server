import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { CommunityGuidelinesTemplate } from './community.guidelines.template.entity';
import { CommunityGuidelinesTemplateService } from './community.guidelines.template.service';
import { CommunityGuidelinesTemplateAuthorizationService } from './community.guidelines.template.service.authorization';
import { CommunityGuidelinesTemplateResolverFields } from '@domain/template/community-guidelines-template/community.guidelines.template.resolver.fields';
import { CommunityGuidelinesTemplateResolverMutations } from './community.guidelines.template.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateBaseModule,
    ProfileModule,
    CommunityGuidelinesModule,
    TypeOrmModule.forFeature([CommunityGuidelinesTemplate]),
  ],
  providers: [
    CommunityGuidelinesTemplateService,
    CommunityGuidelinesTemplateAuthorizationService,
    CommunityGuidelinesTemplateResolverFields,
    CommunityGuidelinesTemplateResolverMutations,
  ],
  exports: [
    CommunityGuidelinesTemplateService,
    CommunityGuidelinesTemplateAuthorizationService,
    CommunityGuidelinesTemplateResolverFields,
  ],
})
export class CommunityGuidelinesTemplateModule {}
