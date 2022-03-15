import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { VerifiedCredentialService } from './verified.credential.service';

@Module({
  imports: [AuthorizationModule],
  providers: [VerifiedCredentialService],
  exports: [VerifiedCredentialService],
})
export class VerifiedCredentialModule {}
