import { Module } from '@nestjs/common';
import { TagsetModule } from '../tagset/tagset.module';
import { TagsetService } from '../tagset/tagset.service';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';

@Module({
  imports: [TagsetModule],
  providers: [ProfileResolver, ProfileService, TagsetService],
  exports: [ProfileService],
})
export class ProfileModule {}
