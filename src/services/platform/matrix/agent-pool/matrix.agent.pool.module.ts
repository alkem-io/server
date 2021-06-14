import { Module } from '@nestjs/common';
import { MatrixManagementModule } from '../management/matrix.management.module';
import { MatrixAgentPool } from './matrix.agent.pool';

@Module({
  imports: [MatrixManagementModule],
  providers: [MatrixAgentPool],
  exports: [MatrixAgentPool],
})
export class MatrixAgentPoolModule {}
