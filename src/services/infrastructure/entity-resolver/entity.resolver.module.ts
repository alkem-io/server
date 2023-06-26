import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { IdentityResolverService } from './identity.resolver.service';
import { CommunityResolverService } from './community.resolver.service';
import { Community } from '@domain/community/community/community.entity';
import { StorageBucketResolverService } from './storage.bucket.resolver.service';
import { Communication } from '@domain/communication/communication/communication.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { Profile } from '@domain/common/profile/profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Communication]),
    TypeOrmModule.forFeature([StorageBucket]),
    TypeOrmModule.forFeature([Profile]),
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
