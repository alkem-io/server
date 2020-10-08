import { Module } from '@nestjs/common';
import { ReferenceModule } from '../reference/reference.module';
import { TagsetModule } from '../tagset/tagset.module';
import { TagsetService } from '../tagset/tagset.service';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';

@Module({
  imports: [
    ReferenceModule,
    TagsetModule
  ],
  providers: [ProfileService, ProfileResolver, TagsetService],
  exports: [ProfileService]
})
export class ProfileModule {}
