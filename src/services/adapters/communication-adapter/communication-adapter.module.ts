import { Module } from '@nestjs/common';
import { MatrixAgentPoolModule } from '@services/external/matrix/agent-pool/matrix.agent.pool.module';
import { MatrixUserManagementModule } from '@services/external/matrix/management/matrix.user.management.module';
import { MatrixGroupAdapterModule } from '@services/external/matrix/adapter-group/matrix.group.adapter.module';
import { MatrixRoomAdapterModule } from '@services/external/matrix/adapter-room/matrix.room.adapter.module';
import { MatrixAgentModule } from '@services/external/matrix/agent/matrix.agent.module';
import { MatrixUserAdapterModule } from '@services/external/matrix/adapter-user/matrix.user.adapter.module';
import { CommunicationAdapter } from './communication.adapter';
import { MicroservicesModule } from '@core/microservices/microservices.module';

@Module({
  imports: [
    MatrixUserManagementModule,
    MatrixUserAdapterModule,
    MatrixRoomAdapterModule,
    MatrixGroupAdapterModule,
    MatrixAgentModule,
    MatrixAgentPoolModule,
    MicroservicesModule,
  ],
  providers: [CommunicationAdapter],
  exports: [CommunicationAdapter],
})
export class CommunicationAdapterModule {}
