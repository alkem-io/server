import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserResolverFields } from './user.resolver.fields';
import { IsUserAlreadyExistConstraint } from '@utils/validation/constraints/user.exists.constraint';
import { UserResolverMutations } from './user.resolver.mutations';
import { AuthorisationModule } from '@utils/authorisation/authorisation.module';

@Module({
  imports: [
    forwardRef(() => AuthorisationModule),
    ProfileModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    UserService,
    UserResolverMutations,
    UserResolverQueries,
    UserResolverFields,
    IsUserAlreadyExistConstraint,
  ],
  exports: [UserService],
})
export class UserModule {}
