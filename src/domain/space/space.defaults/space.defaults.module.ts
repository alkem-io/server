import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceDefaults } from './space.defaults.entity';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceDefaultsResolverMutations } from './space.defaults.resolver.mutations';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { TemplateModule } from '@domain/template/template/template.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateModule,
    TemplatesSetModule,
    TypeOrmModule.forFeature([SpaceDefaults]),
  ],
  providers: [SpaceDefaultsService, SpaceDefaultsResolverMutations],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
