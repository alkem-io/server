import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceDefaults } from './space.defaults.entity';
import { InnovationFlowTemplateModule } from '@domain/template/innovation-flow-template/innovation.flow.template.module';
import { InnovationFlowStatesModule } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { Account } from '../account/account.entity';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    InnovationFlowTemplateModule,
    InnovationFlowStatesModule,
    TemplatesSetModule,
    TypeOrmModule.forFeature([SpaceDefaults]),
    TypeOrmModule.forFeature([Account]),
  ],
  providers: [SpaceDefaultsService],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
