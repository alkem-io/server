import { Module } from '@nestjs/common';
import { LicensingCredentialBasedService } from './licensing.credential.based.service';

@Module({
  imports: [],
  providers: [LicensingCredentialBasedService],
  exports: [LicensingCredentialBasedService],
})
export class LicensingCredentialBasedModule {}
