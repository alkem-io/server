import { Module } from '@nestjs/common';
import { LicenseIssuerService } from './license.issuer.service';
import { AgentModule } from '@domain/agent/agent/agent.module';

@Module({
  imports: [AgentModule],
  providers: [LicenseIssuerService],
  exports: [LicenseIssuerService],
})
export class LicenseIssuerModule {}
