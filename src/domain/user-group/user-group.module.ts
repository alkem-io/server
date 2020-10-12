import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolver } from './user-group.resolver';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [UserGroupService, UserGroupResolver],
  exports: [UserGroupService],
})
export class UserGroupModule {}
