import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolver } from './user-group.resolver';
import { ProfileModule } from '../profile/profile.module';
import { ProfileService } from '../profile/profile.service';
import { TagsetModule } from '../tagset/tagset.module';
import { TagsetService } from '../tagset/tagset.service';

@Module({
  imports: [],
  providers: [UserGroupService, UserGroupResolver],
  exports: [UserGroupService]
})
export class UserGroupModule {}
