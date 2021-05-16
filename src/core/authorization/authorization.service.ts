import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  GrantAuthorizationCredentialInput,
  RemoveAuthorizationCredentialInput,
  UsersWithAuthorizationCredentialInput,
} from '@core/authorization';
import { IUser } from '@domain/community/user';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { AuthorizationCredentialGlobal } from '../../common/enums/authorization.credential.global';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { AuthorizationCredential } from '../../common/enums/authorization.credential';
import { AgentService } from '@domain/agent/agent/agent.service';
import { UserInfo } from '@core/authentication';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly agentService: AgentService,
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async grantCredential(
    grantCredentialData: GrantAuthorizationCredentialInput,
    currentUserInfo?: UserInfo
  ): Promise<IUser> {
    // check the inputs
    if (this.isGlobalAuthorizationCredential(grantCredentialData.type)) {
      if (grantCredentialData.resourceID)
        throw new ForbiddenException(
          `resourceID should not be specified for global AuthorizationCredentials: ${grantCredentialData.type}`,
          LogContext.AUTH
        );
    }
    const { user, agent } = await this.userService.getUserAndAgent(
      grantCredentialData.userID
    );

    // Only a global-admin can assign/remove other global-admins
    if (grantCredentialData.type === AuthorizationCredential.GlobalAdmin) {
      if (currentUserInfo) {
        await this.validateMandatedCredential(
          currentUserInfo.user,
          AuthorizationCredential.GlobalAdmin
        );
      }
    }

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: grantCredentialData.type,
      resourceID: grantCredentialData.resourceID,
    });
    return user;
  }

  async revokeCredential(
    revokeCredentialData: RemoveAuthorizationCredentialInput,
    currentUserInfo?: UserInfo
  ): Promise<IUser> {
    // check the inputs
    if (this.isGlobalAuthorizationCredential(revokeCredentialData.type)) {
      if (revokeCredentialData.resourceID)
        throw new ForbiddenException(
          `resourceID should not be specified for global AuthorizationCredentials: ${revokeCredentialData.type}`,
          LogContext.AUTH
        );
    }

    const { user, agent } = await this.userService.getUserAndAgent(
      revokeCredentialData.userID
    );

    // Check not the last global admin
    await this.removeValidationSingleGlobalAdmin(revokeCredentialData.type);

    // Only a global-admin can assign/remove other global-admins
    if (revokeCredentialData.type === AuthorizationCredential.GlobalAdmin) {
      if (currentUserInfo) {
        await this.validateMandatedCredential(
          currentUserInfo.user,
          AuthorizationCredential.GlobalAdmin
        );
      }
    }

    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: revokeCredentialData.type,
      resourceID: revokeCredentialData.resourceID,
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
      resourceID: credentialCriteria.resourceID,
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
