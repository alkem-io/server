import { Module } from '@nestjs/common';
import { TagsetModule } from '../tagset/tagset.module';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';

@Module({
  imports: [TagsetModule],
  providers: [ProfileResolver, ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
