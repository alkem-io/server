import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { InputCreatorService } from './input.creator.service';
import { InputCreatorResolverQueries } from './input.creator.resolver.queries';
import { InputCreatorResolverFields } from './input.creator.resolver.fields';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';

@Module({
  imports: [
    AuthorizationModule,
    CollaborationModule,
    WhiteboardModule,
    InnovationFlowModule,
    CalloutModule,
    CommunityGuidelinesModule,
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
