import { Module } from '@nestjs/common';
import { MatrixUserManagementModule } from '@src/services/platform/matrix/management/matrix.user.management.module';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { MatrixUserAdapterModule } from '../user/matrix.user.adapter.module';

@Module({
  imports: [MatrixUserManagementModule, MatrixUserAdapterModule],
  providers: [MatrixAgentPool],
  exports: [MatrixAgentPool],
})
export class MatrixAgentPoolModule {}
