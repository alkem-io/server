import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [ProfileModule],
  providers: [UserService, UserResolver],
  exports: [UserService]
})
export class UserModule {}
