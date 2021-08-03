import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  GrantAuthorizationCredentialInput,
  RevokeAuthorizationCredentialInput,
  UsersWithAuthorizationCredentialInput,
} from '@core/authorization';
import { IUser } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import {
  LogContext,
  AuthorizationCredentialGlobal,
  AuthorizationCredential,
  AuthorizationPrivilege,
} from '@common/enums';
import {
  EntityNotFoundException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AgentInfo } from '@core/authentication';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { UserAuthorizationPrivilegesInput } from './dto/authorization.dto.user.authorization.privileges';
import {
  AuthorizationDefinition,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';

@Injectable()
export class AuthorizationService {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private readonly agentService: AgentService,
    private readonly userService: UserService,
    @InjectRepository(AuthorizationDefinition)
    private authoriationDefinitionRepository: Repository<AuthorizationDefinition>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async grantCredential(
    grantCredentialData: GrantAuthorizationCredentialInput,
    currentAgentInfo?: AgentInfo
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
      if (currentAgentInfo) {
        await this.validateMandatedCredential(
          currentAgentInfo.credentials,
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
    revokeCredentialData: RevokeAuthorizationCredentialInput,
    currentAgentInfo?: AgentInfo
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
      if (currentAgentInfo) {
        await this.validateMandatedCredential(
          currentAgentInfo.credentials,
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
    credentials: ICredential[],
    credentialType: AuthorizationCredential
  ) {
    const result = await this.hasMatchingCredential(credentials, {
      type: credentialType,
    });
    if (!result)
      throw new ForbiddenException(
        `User does not have required credential assigned: ${credentialType}`,
        LogContext.AUTH
      );
  }

  hasMatchingCredential(
    credentials: ICredential[],
    credentialCriteria: CredentialsSearchInput
  ): boolean {
    for (const credential of credentials) {
      if (credential.type === credentialCriteria.type) {
        if (!credentialCriteria.resourceID) return true;
        if (credentialCriteria.resourceID === credential.resourceID)
          return true;
      }
    }
    return false;
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

  async userAuthorizationPrivileges(
    userAuthorizationPrivilegesData: UserAuthorizationPrivilegesInput
  ): Promise<AuthorizationPrivilege[]> {
    // get the user
    const { credentials } = await this.userService.getUserAndCredentials(
      userAuthorizationPrivilegesData.userID
    );

    const authorizationDefinition = await this.getAuthorizationDefinitionOrFail(
      userAuthorizationPrivilegesData.authorizationID
    );

    const privileges = await this.authorizationEngine.getGrantedPrivileges(
      credentials,
      authorizationDefinition
    );
    return privileges;
  }

  async getAuthorizationDefinitionOrFail(
    authorizationID: string
  ): Promise<IAuthorizationPolicy> {
    const authorizationDefinition =
      await this.authoriationDefinitionRepository.findOne({
        id: authorizationID,
      });
    if (!authorizationDefinition)
      throw new EntityNotFoundException(
        `Not able to locate AuthorizationDefinition with the specified ID: ${authorizationID}`,
        LogContext.CHALLENGES
      );
    return authorizationDefinition;
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
