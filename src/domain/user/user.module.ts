import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { ProfileModule } from '../profile/profile.module';
import { TagsetModule } from '../tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';

@Module({
  imports: [ProfileModule, TagsetModule, TypeOrmModule.forFeature([User])],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
