import { UserModule } from '@domain/community/user/user.module';
import { forwardRef, Module } from '@nestjs/common';
import { MatrixAgentPoolModule } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool.module';
import { MatrixUserManagementModule } from '@src/services/platform/matrix/management/matrix.user.management.module';
import { MatrixUserAdapterModule } from '../matrix/user/matrix.user.adapter.module';
import { CommunicationService } from './communication.service';

@Module({
  imports: [
    MatrixUserManagementModule,
    MatrixUserAdapterModule,
    MatrixAgentPoolModule,
    forwardRef(() => UserModule),
  ],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
