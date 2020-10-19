import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolver } from './user-group.resolver';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from './user-group.entity';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [ProfileModule, UserModule, TypeOrmModule.forFeature([UserGroup])],
  providers: [UserGroupService, UserGroupResolver],
  exports: [UserGroupService],
})
export class UserGroupModule {}
