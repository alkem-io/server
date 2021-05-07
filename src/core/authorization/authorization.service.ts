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
import { ICredential } from '@domain/common/credential';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { CredentialService } from '@domain/common/credential/credential.service';
import { AuthorizationCredentialGlobal } from './authorization.credential.global';
import { ValidationException } from '@common/exceptions';
import { AuthorizationCredential } from './authorization.credential';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly userService: UserService,
    private readonly credentialService: CredentialService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async assignCredential(
    assignCredentialData: AssignAuthorizationCredentialInput
  ): Promise<IUser> {
    return await this.userService.assignCredential({
      userID: assignCredentialData.userID,
      type: assignCredentialData.type.toString(),
      resourceID: assignCredentialData.resourceID,
    });
  }

  async removeCredential(
    removeCredentialData: RemoveAuthorizationCredentialInput
  ): Promise<IUser> {
    return await this.userService.removeCredential({
      userID: removeCredentialData.userID,
      type: removeCredentialData.type.toString(),
      resourceID: removeCredentialData.resourceID,
    });
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
