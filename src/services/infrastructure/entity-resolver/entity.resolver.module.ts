import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityResolverService } from './identity.resolver.service';
import { CommunityResolverService } from './community.resolver.service';
import { Community } from '@domain/community/community/community.entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { TimelineResolverService } from './timeline.resolver.service';
import { ContributionResolverService } from './contribution.resolver.service';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { RoomResolverService } from './room.resolver.service';
import { UrlGeneratorModule } from '../url-generator';

@Module({
  imports: [
    UrlGeneratorModule,
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([VirtualContributor]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Communication]),
  ],
  providers: [
    IdentityResolverService,
    CommunityResolverService,
    TimelineResolverService,
    ContributionResolverService,
    RoomResolverService,
  ],
  exports: [
    IdentityResolverService,
    CommunityResolverService,
    TimelineResolverService,
    ContributionResolverService,
    RoomResolverService,
  ],
})
export class EntityResolverModule {}
