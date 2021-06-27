import { UserModule } from '@domain/community/user/user.module';
import { forwardRef, Module } from '@nestjs/common';
import { MatrixAgentPoolModule } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool.module';
import { MatrixUserManagementModule } from '@src/services/platform/matrix/management/matrix.user.management.module';
import { CommunicationService } from './communication.service';

@Module({
  imports: [
    MatrixUserManagementModule,
    MatrixAgentPoolModule,
    forwardRef(() => UserModule),
  ],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
