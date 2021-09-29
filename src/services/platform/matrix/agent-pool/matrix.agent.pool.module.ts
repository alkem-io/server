import { Module } from '@nestjs/common';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { MatrixUserManagementModule } from '@src/services/platform/matrix/management/matrix.user.management.module';
import { MatrixAgentModule } from '../agent/matrix.agent.module';

@Module({
  imports: [MatrixUserManagementModule, MatrixAgentModule],
  providers: [MatrixAgentPool],
  exports: [MatrixAgentPool],
})
export class MatrixAgentPoolModule {}
