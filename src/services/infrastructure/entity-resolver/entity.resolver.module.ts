import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Updates } from '@domain/communication/updates/updates.entity';
import { IdentityResolverService } from './identity.resolver.service';
import { CommunityResolverService } from './community.resolver.service';
import { Community } from '@domain/community/community/community.entity';
import { StorageBucketResolverService } from './storage.bucket.resolver.service';
import { Communication } from '@domain/communication/communication/communication.entity';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([Updates]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Communication]),
    IpfsModule,
  ],
  providers: [
    IdentityResolverService,
    CommunityResolverService,
    StorageBucketResolverService,
  ],
  exports: [
    IdentityResolverService,
    CommunityResolverService,
    StorageBucketResolverService,
  ],
})
export class EntityResolverModule {}
