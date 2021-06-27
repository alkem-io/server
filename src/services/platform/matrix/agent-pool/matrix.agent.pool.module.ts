import { Module } from '@nestjs/common';
import { MatrixUserManagementModule } from '@src/services/platform/matrix/management/matrix.user.management.module';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';

@Module({
  imports: [MatrixUserManagementModule],
  providers: [MatrixAgentPool],
  exports: [MatrixAgentPool],
})
export class MatrixAgentPoolModule {}
