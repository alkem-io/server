import { Communication } from '@domain/communication/communication/communication.entity';
import { Community } from '@domain/community/community/community.entity';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UrlGeneratorModule } from '../url-generator';
import { CommunityResolverService } from './community.resolver.service';
import { ContributionResolverService } from './contribution.resolver.service';
import { RoomResolverService } from './room.resolver.service';
import { TimelineResolverService } from './timeline.resolver.service';

@Module({
  imports: [
    UrlGeneratorModule,
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([VirtualContributor]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Communication]),
  ],
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
