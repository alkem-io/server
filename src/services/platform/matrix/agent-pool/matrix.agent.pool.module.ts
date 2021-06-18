import { Module } from '@nestjs/common';
import { MatrixManagementModule } from '@src/services/platform/matrix/management/matrix.management.module';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';

@Module({
  imports: [MatrixManagementModule],
  providers: [MatrixAgentPool],
  exports: [MatrixAgentPool],
})
export class MatrixAgentPoolModule {}
