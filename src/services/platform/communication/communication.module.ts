import { UserModule } from '@domain/community/user/user.module';
import { forwardRef, Module } from '@nestjs/common';
import { MatrixAgentPoolModule } from '../matrix/agent-pool/matrix.agent.pool.module';
import { MatrixManagementModule } from '../matrix/management/matrix.management.module';
import { CommunicationService } from './communication.service';

@Module({
  imports: [
    MatrixManagementModule,
    MatrixAgentPoolModule,
    forwardRef(() => UserModule),
  ],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
