import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UserAuthenticationLinkService } from './user.authentication.link.service';

@Module({
  imports: [UserLookupModule, KratosModule],
  providers: [UserAuthenticationLinkService],
  exports: [UserAuthenticationLinkService],
})
export class UserAuthenticationLinkModule {}
