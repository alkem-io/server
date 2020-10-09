import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolver } from './user-group.resolver';
import { UserService } from '../user/user.service';

@Module({
  imports: [UserService],
  providers: [UserGroupService, UserGroupResolver, UserService],
  exports: [UserGroupService],
})
export class UserGroupModule {}
