import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { CredentialResolverFields } from './credential.resolver.fields';
import { CredentialService } from './credential.service';

@Module({
  imports: [AuthorizationModule],
  providers: [CredentialService, CredentialResolverFields],
  exports: [CredentialService],
})
export class CredentialModule {}
