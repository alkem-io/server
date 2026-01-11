import { Module } from '@nestjs/common';
import { LicenseIssuerService } from './license.issuer.service';
import { ActorModule } from '@domain/actor/actor/actor.module';

@Module({
  imports: [ActorModule],
  providers: [LicenseIssuerService],
  exports: [LicenseIssuerService],
})
export class LicenseIssuerModule {}
