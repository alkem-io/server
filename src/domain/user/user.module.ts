import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { ProfileModule } from '../profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserGroupModule } from '../user-group/user-group.module';
import { EcoverseModule } from '../ecoverse/ecoverse.module';

@Module({
  imports: [
    ProfileModule,
    TypeOrmModule.forFeature([User]),
    forwardRef(() => UserGroupModule),
    forwardRef(() => EcoverseModule),
  ],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
