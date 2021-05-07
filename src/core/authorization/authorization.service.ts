import { UserService } from '@domain/community/user/user.service';
import {
  Inject,
  Injectable,
  LoggerService,
  NotImplementedException,
} from '@nestjs/common';
import {
  AssignAuthorizationCredentialInput,
  RemoveAuthorizationCredentialInput,
  UsersWithAuthorizationCredentialInput,
} from '@core/authorization';
import { IUser } from '@domain/community/user';
import { ICredential } from '@domain/agent/credential';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { CredentialService } from '@domain/agent/credential/credential.service';
import { AuthorizationCredentialGlobal } from './authorization.credential.global';
import { ValidationException } from '@common/exceptions';
import { AuthorizationCredential } from './authorization.credential';
import { AgentService } from '@domain/agent/agent/agent.service';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly agentService: AgentService,
    private readonly userService: UserService,
    private readonly credentialService: CredentialService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async assignCredential(
    assignCredentialData: AssignAuthorizationCredentialInput
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(
      assignCredentialData.userID
    );
    user.agent = await this.agentService.assignCredential({
      agentID: agent.id,
      type: assignCredentialData.type.toString(),
      resourceID: assignCredentialData.resourceID,
    });
    return user;
  }

  async removeCredential(
    removeCredentialData: RemoveAuthorizationCredentialInput
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(
      removeCredentialData.userID
    );

    user.agent = await this.agentService.removeCredential({
      agentID: agent.id,
      type: removeCredentialData.type.toString(),
      resourceID: removeCredentialData.resourceID,
    });
    return user;
  }

  async usersWithCredentials(
    credentialCriteria: UsersWithAuthorizationCredentialInput
  ): Promise<IUser[]> {
    if (!this.isAuthorizationCredential(credentialCriteria.type))
      throw new ValidationException(
        `Invalid type provided: ${credentialCriteria.type}`,
        LogContext.AUTH
      );

    return await this.userService.usersWithCredentials({
      type: credentialCriteria.type.toString(),
    });
  }

  isGlobalAuthorizationCredential(credentialType: string): boolean {
    const values = Object.values(AuthorizationCredentialGlobal);
    const match = values.find(value => value.toString() === credentialType);
    if (match) return true;
    return false;
  }

  isAuthorizationCredential(credentialType: string): boolean {
    const values = Object.values(AuthorizationCredential);
    const match = values.find(value => value.toString() === credentialType);
    if (match) return true;
    return false;
  }

  isAuthorized(
    assignedCredentials: ICredential[],
    acceptedPriviliges: string[]
  ): boolean {
    this.logger.verbose?.(
      `Validating authorization via credentials: ${assignedCredentials.length} - ${acceptedPriviliges}`,
      LogContext.AUTH
    );
    throw new NotImplementedException(
      'Custom validation of authorization not yet implemented'
    );
  }
}
