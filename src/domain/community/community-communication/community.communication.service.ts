import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';
import { ICommunication } from '@domain/communication/communication';

@Injectable()
export class CommunityCommunicationService {
  constructor(
    private communicationService: CommunicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async addMemberToCommunication(
    communication: ICommunication,
    actorId: string
  ): Promise<void> {
    this.communicationService
      .addContributorToCommunications(communication, actorId)
      .catch(error =>
        this.logger.error(
          {
            message: `Unable to add user to community messaging (${communication.id})`,
            error: error?.message,
            details: error?.details,
          },
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }

  public async removeMemberFromCommunication(
    communication: ICommunication,
    actorId: string
  ): Promise<void> {
    this.communicationService
      .removeContributorFromCommunications(communication, actorId)
      .catch(error =>
        this.logger.error(
          {
            message: `Unable remove contributor from community messaging (${communication.id})`,
            error: error?.message,
            details: error?.details,
          },
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }
}
