import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceAboutAuthorizationService } from './space.about.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { SpaceAboutService } from './space.about.service';
import { SpaceAboutResolverFields } from './space.about.resolver.fields';
import { SpaceAbout } from './space.about.entity';
import { SpaceLookupModule } from '../space.lookup/space.lookup.module';
import { TemplateContentSpaceLookupModule } from '@domain/template/template-content-space/template-content-space.lookup/template-content-space.lookup.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { SpaceAboutMembershipModule } from '../space.about.membership/space.about.membership.module';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CommunityGuidelinesModule,
    ProfileModule,
    SpaceLookupModule,
    TemplateContentSpaceLookupModule,
    SpaceAboutMembershipModule,
    RoleSetModule,
    InputCreatorModule,
    TypeOrmModule.forFeature([SpaceAbout]),
  ],
  providers: [
    SpaceAboutResolverFields,
    SpaceAboutService,
    SpaceAboutAuthorizationService,
  ],
  exports: [SpaceAboutService, SpaceAboutAuthorizationService],
})
export class SpaceAboutModule {}
