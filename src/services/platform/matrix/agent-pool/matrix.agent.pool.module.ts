import { Module } from '@nestjs/common';
import { MatrixUserManagementModule } from '@src/services/platform/matrix/management/matrix.user.management.module';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { MatrixUserAdapterModule } from '../user/matrix.user.adapter.module';
import { MatrixAgentService } from './matrix.agent.service';
import { MatrixAdaptersModule } from '../adapter/matrix.adapters.module';

@Module({
  imports: [
    MatrixUserManagementModule,
    MatrixUserAdapterModule,
    MatrixAdaptersModule,
  ],
  providers: [MatrixAgentPool, MatrixAgentService],
  exports: [MatrixAgentPool, MatrixAgentService],
})
export class MatrixAgentPoolModule {}
