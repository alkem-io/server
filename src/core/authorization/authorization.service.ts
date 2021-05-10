import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  AssignAuthorizationCredentialInput,
  RemoveAuthorizationCredentialInput,
  UsersWithAuthorizationCredentialInput,
} from '@core/authorization';
import { IUser } from '@domain/community/user';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { AuthorizationCredentialGlobal } from './authorization.credential.global';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { AuthorizationCredential } from './authorization.credential';
import { AgentService } from '@domain/agent/agent/agent.service';
import { UserInfo } from '@core/authentication';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly agentService: AgentService,
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async assignCredential(
    assignCredentialData: AssignAuthorizationCredentialInput,
    currentUserInfo?: UserInfo
  ): Promise<IUser> {
    // check the inputs
    if (this.isGlobalAuthorizationCredential(assignCredentialData.type)) {
      if (assignCredentialData.resourceID)
        throw new ForbiddenException(
          `resourceID should not be specified for global AuthorizationCredentials: ${assignCredentialData.type}`,
          LogContext.AUTH
        );
    }
    const { user, agent } = await this.userService.getUserAndAgent(
      assignCredentialData.userID
    );

    // Only a global-admin can assign/remove other global-admins
    if (assignCredentialData.type === AuthorizationCredential.GlobalAdmin) {
      if (currentUserInfo) {
        await this.validateMandatedCredential(
          currentUserInfo.user,
          AuthorizationCredential.GlobalAdmin
        );
      }
    }

    user.agent = await this.agentService.assignCredential({
      agentID: agent.id,
      type: assignCredentialData.type,
      resourceID: assignCredentialData.resourceID,
    });
    return user;
  }

  async removeCredential(
    removeCredentialData: RemoveAuthorizationCredentialInput,
    currentUserInfo?: UserInfo
  ): Promise<IUser> {
    // check the inputs
    if (this.isGlobalAuthorizationCredential(removeCredentialData.type)) {
      if (removeCredentialData.resourceID)
        throw new ForbiddenException(
          `resourceID should not be specified for global AuthorizationCredentials: ${removeCredentialData.type}`,
          LogContext.AUTH
        );
    }

    const { user, agent } = await this.userService.getUserAndAgent(
      removeCredentialData.userID
    );

    // Check not the last global admin
    await this.removeValidationSingleGlobalAdmin(removeCredentialData.type);

    // Only a global-admin can assign/remove other global-admins
    if (removeCredentialData.type === AuthorizationCredential.GlobalAdmin) {
      if (currentUserInfo) {
        await this.validateMandatedCredential(
          currentUserInfo.user,
          AuthorizationCredential.GlobalAdmin
        );
      }
    }

    user.agent = await this.agentService.removeCredential({
      agentID: agent.id,
      type: removeCredentialData.type,
      resourceID: removeCredentialData.resourceID,
    });

    return user;
  }

  async validateMandatedCredential(
    user: IUser | undefined,
    credentialType: AuthorizationCredential
  ) {
    if (!user)
      throw new ForbiddenException(
        `Current user could not be retried to check credential: ${credentialType}`,
        LogContext.AUTH
      );
    const result = await this.userService.hasMatchingCredential(user, {
      type: credentialType,
    });
    if (!result)
      throw new ForbiddenException(
        `User (${user.id}) does not have required credential assigned: ${credentialType}`,
        LogContext.AUTH
      );
  }

  async removeValidationSingleGlobalAdmin(
    credentialType: string
  ): Promise<boolean> {
    const globalAdminType = AuthorizationCredential.GlobalAdmin.toString();
    if (credentialType === globalAdminType) {
      // Check more than one
      const globalAdmins = await this.usersWithCredentials({
        type: AuthorizationCredential.GlobalAdmin,
      });
      if (globalAdmins.length < 2)
        throw new ForbiddenException(
          `Not allowed to remove ${credentialType}: last global-admin`,
          LogContext.AUTH
        );
    }
    return true;
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
}
