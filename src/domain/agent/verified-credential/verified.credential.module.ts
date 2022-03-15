import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { VerifiedCredentialResolverFields } from './verified.credential.resolver.fields';
import { VerifiedCredentialService } from './verified.credential.service';

@Module({
  imports: [AuthorizationModule],
  providers: [VerifiedCredentialService, VerifiedCredentialResolverFields],
  exports: [VerifiedCredentialService, VerifiedCredentialResolverFields],
})
export class VerifiedCredentialModule {}
