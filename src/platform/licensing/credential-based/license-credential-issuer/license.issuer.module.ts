import { AgentModule } from '@domain/agent/agent/agent.module';
import { Module } from '@nestjs/common';
import { LicenseIssuerService } from './license.issuer.service';

@Module({
  imports: [AgentModule],
  providers: [LicenseIssuerService],
  exports: [LicenseIssuerService],
})
export class LicenseIssuerModule {}
