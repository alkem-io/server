import { LogContext } from '@common/enums';
import { CommunicationSessionUndefinedException } from '@common/exceptions/communication.session.undefined.exception';
import { Inject, Injectable } from '@nestjs/common';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { PubSub } from 'graphql-subscriptions';
import { MatrixUserAdapterService } from '../matrix/adapter-user/matrix.user.adapter.service';
import {
  RoomMonitorFactory,
  RoomTimelineMonitorFactory,
} from '../matrix/events/matrix.event.adpater.room';
import {
  COMMUNICATION_MESSAGE_RECEIVED,
  ROOM_INVITATION_RECEIVED,
} from '../subscription/subscription.events';
import { PUB_SUB } from '../subscription/subscription.module';

@Injectable()
export class CommunicationServiceEvents {
  constructor(
    private matrixAgentPool: MatrixAgentPool,
    private matrixUserAdapterService: MatrixUserAdapterService,
    @Inject(PUB_SUB)
    private readonly subscriptionHandler: PubSub
  ) {}

  async startSession(email: string, key: string) {
    if (!key) {
      throw new CommunicationSessionUndefinedException(
        'Attempted to start a session without providing a session key',
        LogContext.COMMUNICATION
      );
    }

    const matrixAgent = await this.matrixAgentPool.acquire(email, key);

    matrixAgent.attach({
      id: key,
      roomTimelineMonitor: RoomTimelineMonitorFactory.create(
        this.matrixUserAdapterService,
        message => {
          this.subscriptionHandler.publish(
            COMMUNICATION_MESSAGE_RECEIVED,
            message
          );
        }
      ),
      roomMonitor: RoomMonitorFactory.create(message => {
        this.subscriptionHandler.publish(ROOM_INVITATION_RECEIVED, message);
      }),
    });
  }

  async endSession(key: string) {
    const matrixAgent = await this.matrixAgentPool.acquireSession(key);
    // the user might have opened connections on multiple clients
    matrixAgent.detach(key);
    await this.matrixAgentPool.releaseSession(key);
  }
}
