import { Module } from '@nestjs/common';
import { UrlGeneratorModule } from '../url-generator';
import { CommunityResolverService } from './community.resolver.service';
import { ContributionResolverService } from './contribution.resolver.service';
import { RoomResolverService } from './room.resolver.service';
import { TimelineResolverService } from './timeline.resolver.service';

@Module({
  imports: [UrlGeneratorModule],
  providers: [
    CommunityResolverService,
    TimelineResolverService,
    ContributionResolverService,
    RoomResolverService,
  ],
  exports: [
    CommunityResolverService,
    TimelineResolverService,
    ContributionResolverService,
    RoomResolverService,
  ],
})
export class EntityResolverModule {}
