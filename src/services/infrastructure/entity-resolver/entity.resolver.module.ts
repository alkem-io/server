import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { IdentityResolverService } from './identity.resolver.service';
import { CommunityResolverService } from './community.resolver.service';
import { Community } from '@domain/community/community/community.entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { TimelineResolverService } from './timeline.resolver.service';
import { ContributionResolverService } from './contribution.resolver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Communication]),
    TypeOrmModule.forFeature([Profile]),
  ],
  providers: [
    IdentityResolverService,
    CommunityResolverService,
    TimelineResolverService,
    ContributionResolverService,
  ],
  exports: [
    IdentityResolverService,
    CommunityResolverService,
    TimelineResolverService,
    ContributionResolverService,
  ],
})
export class EntityResolverModule {}
