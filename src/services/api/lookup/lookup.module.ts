import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LookupService } from './lookup.service';
import { LookupResolverQueries } from './lookup.resolver.queries';
import { LookupResolverFields } from './lookup.resolver.fields';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';

@Module({
  imports: [
    AuthorizationModule,
    CommunityModule,
    CollaborationModule,
    WhiteboardModule,
  ],
  providers: [LookupService, LookupResolverQueries, LookupResolverFields],
  exports: [LookupService],
})
export class LookupModule {}
