import { Module } from '@nestjs/common';
import { MatrixAgentPool } from '@services/external/matrix/agent-pool/matrix.agent.pool';
import { MatrixUserManagementModule } from '@services/external/matrix/management/matrix.user.management.module';
import { MatrixAgentModule } from '../agent/matrix.agent.module';

@Module({
  imports: [MatrixUserManagementModule, MatrixAgentModule],
  providers: [MatrixAgentPool],
  exports: [MatrixAgentPool],
})
export class MatrixAgentPoolModule {}
