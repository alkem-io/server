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
import { RoleSetModule } from '@domain/access/role-set/role.set.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ProfileModule,
    SpaceLookupModule,
    RoleSetModule,
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
