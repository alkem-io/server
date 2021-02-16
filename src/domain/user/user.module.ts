import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserResolverFields } from './user.resolver.fields';
import { IsUserAlreadyExistConstraint } from '@utils/validation/constraints/user.exists.constraint';
import { UserFactoryService } from './user.factory.service';
import { UserResolverMutations } from './user.resolver.mutations';

@Module({
  imports: [ProfileModule, TypeOrmModule.forFeature([User])],
  providers: [
    UserService,
    UserFactoryService,
    UserResolverMutations,
    UserResolverQueries,
    UserResolverFields,
    IsUserAlreadyExistConstraint,
  ],
  exports: [UserService, UserFactoryService],
})
export class UserModule {}
