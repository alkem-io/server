import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserResolverFields } from './user.resolver.fields';
import { UserResolverMutations } from './user.resolver.mutations';
import { CredentialModule } from '@domain/common/credential/credential.module';

@Module({
  imports: [ProfileModule, CredentialModule, TypeOrmModule.forFeature([User])],
  providers: [
    UserService,
    UserResolverMutations,
    UserResolverQueries,
    UserResolverFields,
  ],
  exports: [UserService],
})
export class UserModule {}
