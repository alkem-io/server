import { Module } from '@nestjs/common';
import { LicensePolicyModule } from '../license-policy/license.policy.module';
import { LicensingCredentialBasedService } from './licensing.credential.based.service';

@Module({
  imports: [LicensePolicyModule],
  providers: [LicensingCredentialBasedService],
  exports: [LicensingCredentialBasedService],
})
export class LicensingCredentialBasedModule {}
