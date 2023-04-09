import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Updates } from '@domain/communication/updates/updates.entity';
import { IdentityResolverService } from './identity.resolver.service';
import { CommunityResolverService } from './community.resolver.service';
import { Community } from '@domain/community/community/community.entity';
import { StorageSpaceResolverService } from './storage.space.resolver.service';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Platform } from '@platform/platfrom/platform.entity';
import { Visual } from '@domain/common/visual';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([Updates]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Communication]),
    TypeOrmModule.forFeature([Hub]),
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([InnovationPack]),
    TypeOrmModule.forFeature([Platform]),
    TypeOrmModule.forFeature([Visual]),
  ],
  providers: [
    IdentityResolverService,
    CommunityResolverService,
    StorageSpaceResolverService,
  ],
  exports: [
    IdentityResolverService,
    CommunityResolverService,
    StorageSpaceResolverService,
  ],
})
export class EntityResolverModule {}
