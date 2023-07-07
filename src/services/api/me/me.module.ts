import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { UserModule } from '@domain/community/user/user.module';
import { MeService } from './me.service';
import { MeResolverQueries } from './me.resolver.queries';

@Module({
  imports: [
    AuthorizationModule,
    ApplicationModule,
    InvitationModule,
    UserModule,
  ],
  providers: [MeService, MeResolverQueries],
  exports: [MeService],
})
export class MeModule {}
