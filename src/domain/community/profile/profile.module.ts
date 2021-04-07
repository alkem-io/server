import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Profile } from './profile.entity';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';
import { IpfsService } from '@src/services/ipfs/ipfs.service';

@Module({
  imports: [TagsetModule, ReferenceModule, TypeOrmModule.forFeature([Profile])],
  providers: [ProfileResolver, ProfileService, IpfsService],
  exports: [ProfileService],
})
export class ProfileModule {}
