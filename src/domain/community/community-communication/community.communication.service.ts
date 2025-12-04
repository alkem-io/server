import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { IUser } from '../user/user.interface';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { IContributor } from '../contributor/contributor.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';
import { ICommunication } from '@domain/communication/communication';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';

@Injectable()
export class CommunityCommunicationService {
  constructor(
    private communicationService: CommunicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async addMemberToCommunication(
    communication: ICommunication,
    contributor: IContributor
  ): Promise<void> {
    if (!contributor.agent?.id) {
      throw new EntityNotInitializedException(
        `Contributor ${contributor.id} does not have an agent`,
        LogContext.COMMUNICATION
      );
    }
    this.communicationService
      .addContributorToCommunications(communication, contributor.agent.id)
      .catch(error =>
        this.logger.error(
          `Unable to add user to community messaging (${communication.id}): ${error}`,
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }

  public async removeMemberFromCommunication(
    communication: ICommunication,
    user: IUser
  ): Promise<void> {
    this.communicationService
      .removeUserFromCommunications(communication, user)
      .catch(error =>
        this.logger.error(
          `Unable remove user from community messaging (${communication.id}): ${error}`,
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }
}
