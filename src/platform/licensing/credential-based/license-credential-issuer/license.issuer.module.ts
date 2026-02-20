import { ActorModule } from '@domain/actor/actor/actor.module';
import { Module } from '@nestjs/common';
import { LicenseIssuerService } from './license.issuer.service';

@Module({
  imports: [ActorModule],
  providers: [LicenseIssuerService],
  exports: [LicenseIssuerService],
})
export class LicenseIssuerModule {}
