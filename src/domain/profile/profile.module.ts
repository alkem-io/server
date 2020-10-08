import { Module } from '@nestjs/common';
import { TagsetService } from '../tagset/tagset.service';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';

@Module({
  imports: [TagsetService],
  providers: [ProfileResolver, ProfileService, TagsetService],
  exports: [ProfileService],
})
export class ProfileModule {}
