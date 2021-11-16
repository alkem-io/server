import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunicationAdminMembershipInput } from './dto';
import { LogContext } from '@common/enums';
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { CommunicationService } from '@domain/communication/communication/communication.service';

@Injectable()
export class AdminCommunicationService {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private communicationService: CommunicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async communicationMembership(
    communicationData: CommunicationAdminMembershipInput
  ): Promise<string[]> {
    this.logger.verbose?.(
      `communicationRoomMembership: ${communicationData.communicationID}`,
      LogContext.COMMUNICATION
    );
    const communication =
      await this.communicationService.getCommunicationOrFail(
        communicationData.communicationID
      );
    const updates = this.communicationService.getUpdates(communication);
    const matrixUserIDs = await this.communicationAdapter.getRoomMembers(
      updates.communicationRoomID
    );
    return matrixUserIDs;
  }
}
