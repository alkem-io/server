import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolver } from './user-group.resolver';
import { UserModule } from '@domain/community/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from './user-group.entity';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { UserGroupResolverFields } from './user-group.resolver.fields';

@Module({
  imports: [ProfileModule, UserModule, TypeOrmModule.forFeature([UserGroup])],
  providers: [UserGroupService, UserGroupResolver, UserGroupResolverFields],
  exports: [UserGroupService],
})
export class UserGroupModule {}
