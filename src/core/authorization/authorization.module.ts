import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { AuthorizationResolverMutations } from './authorization.resolver.mutations';
import { AuthorizationService } from './authorization.service';

@Module({
  imports: [UserModule],
  providers: [AuthorizationService, AuthorizationResolverMutations],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
