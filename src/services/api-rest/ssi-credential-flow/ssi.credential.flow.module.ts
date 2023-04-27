import { AgentModule } from '@domain/agent/agent/agent.module';
import { Module } from '@nestjs/common';
import { SsiCredentialFlowService } from './ssi.credential.flow.service';

@Module({
  imports: [AgentModule],
  providers: [SsiCredentialFlowService],
  exports: [SsiCredentialFlowService],
})
export class SsiCredentialFlowModule {}
