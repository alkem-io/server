import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { ProfileService } from '../profile/profile.service';
import { ProfileModule } from '../profile/profile.module';
import { TagsetModule } from '../tagset/tagset.module';
import { TagsetService } from '../tagset/tagset.service';

@Module({
  imports: [ProfileModule, TagsetModule],
  providers: [UserService, UserResolver, ProfileService, TagsetService],
  exports: [UserService],
})
export class UserModule {}
