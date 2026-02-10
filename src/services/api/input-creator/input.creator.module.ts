import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { InputCreatorResolverFields } from './input.creator.resolver.fields';
import { InputCreatorResolverQueries } from './input.creator.resolver.queries';
import { InputCreatorService } from './input.creator.service';

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
