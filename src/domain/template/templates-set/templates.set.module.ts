import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostTemplateModule } from '../post-template/post.template.module';
import { WhiteboardTemplateModule } from '../whiteboard-template/whiteboard.template.module';
import { InnovationFlowTemplateModule } from '../innovation-flow-template/innovation.flow.template.module';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { TemplatesSet } from './templates.set.entity';
import { TemplatesSetResolverFields } from './templates.set.resolver.fields';
import { TemplatesSetResolverMutations } from './templates.set.resolver.mutations';
import { TemplatesSetService } from './templates.set.service';
import { TemplatesSetAuthorizationService } from './templates.set.service.authorization';
import { CalloutTemplateModule } from '../callout-template/callout.template.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CalloutTemplateModule,
    PostTemplateModule,
    WhiteboardTemplateModule,
    InnovationFlowTemplateModule,
    TemplateBaseModule,
    TypeOrmModule.forFeature([TemplatesSet]),
  ],
  providers: [
    TemplatesSetService,
    TemplatesSetAuthorizationService,
    TemplatesSetResolverMutations,
    TemplatesSetResolverFields,
  ],
  exports: [
    TemplatesSetService,
    TemplatesSetAuthorizationService,
    TemplatesSetResolverMutations,
    TemplatesSetResolverFields,
  ],
})
export class TemplatesSetModule {}
