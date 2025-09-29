import { Module } from '@nestjs/common';
import { LicensingCredentialBasedService } from './licensing.credential.based.service';
import { LicensePolicyModule } from '../license-policy/license.policy.module';

@Module({
  imports: [LicensePolicyModule],
  providers: [LicensingCredentialBasedService],
  exports: [LicensingCredentialBasedService],
})
export class LicensingCredentialBasedModule {}
