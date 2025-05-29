import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { PostModule } from '@domain/collaboration/post/post.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { InputCreatorService } from './input.creator.service';
import { InputCreatorResolverQueries } from './input.creator.resolver.queries';
import { InputCreatorResolverFields } from './input.creator.resolver.fields';
import { InnovationFlowStatesModule } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.module';
import { CalloutFramingModule } from '@domain/collaboration/callout-framing/callout.framing.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { TemplateContentSpaceModule } from '@domain/template/template-content-space/template.content.space.module';

@Module({
  imports: [
    AuthorizationModule,
    CollaborationModule,
    WhiteboardModule,
    InnovationFlowModule,
    InnovationFlowStatesModule,
    PostModule,
    CalloutModule,
    CalloutFramingModule,
    CommunityGuidelinesModule,
    TemplateContentSpaceModule,
    SpaceLookupModule,
  ],
  providers: [
    InputCreatorService,
    InputCreatorResolverQueries,
    InputCreatorResolverFields,
  ],
  exports: [InputCreatorService],
})
export class InputCreatorModule {}
