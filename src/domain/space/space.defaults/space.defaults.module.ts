import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceDefaults } from './space.defaults.entity';
import { InnovationFlowStatesModule } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { Account } from '../account/account.entity';
import { SpaceDefaultsResolverMutations } from './space.defaults.resolver.mutations';
import { TemplateModule } from '@domain/template/template/template.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateModule,
    InnovationFlowStatesModule,
    TemplatesSetModule,
    TypeOrmModule.forFeature([SpaceDefaults]),
    TypeOrmModule.forFeature([Account]),
  ],
  providers: [SpaceDefaultsService, SpaceDefaultsResolverMutations],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
