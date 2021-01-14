import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { ProfileModule } from '@domain/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserResolverFields } from './user.resolver.fields';

@Module({
  imports: [ProfileModule, TypeOrmModule.forFeature([User])],
  providers: [UserService, UserResolver, UserResolverFields],
  exports: [UserService],
})
export class UserModule {}
