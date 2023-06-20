import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { WhiteboardTemplate } from './whiteboard.template.entity';
import { WhiteboardTemplateResolverMutations } from './whiteboard.template.resolver.mutations';
import { WhiteboardTemplateService } from './whiteboard.template.service';
import { WhiteboardTemplateAuthorizationService } from './whiteboard.template.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateBaseModule,
    ProfileModule,
    WhiteboardModule,
    TypeOrmModule.forFeature([WhiteboardTemplate]),
  ],
  providers: [
    WhiteboardTemplateService,
    WhiteboardTemplateAuthorizationService,
    WhiteboardTemplateResolverMutations,
  ],
  exports: [WhiteboardTemplateService, WhiteboardTemplateAuthorizationService],
})
export class WhiteboardTemplateModule {}
