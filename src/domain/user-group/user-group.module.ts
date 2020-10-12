import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolver } from './user-group.resolver';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { ProfileModule } from '../profile/profile.module';
import { ProfileService } from '../profile/profile.service';
import { TagsetModule } from '../tagset/tagset.module';
import { TagsetService } from '../tagset/tagset.service';
import { User } from '../user/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    UserModule,
    ProfileModule,
    TagsetModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    UserGroupService,
    UserGroupResolver,
    ProfileService,
    TagsetService,
    UserService,
  ],
  exports: [UserGroupService],
})
export class UserGroupModule {}
