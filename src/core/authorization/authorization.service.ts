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
import { UserAuthorizationPrivilegesInput } from './dto/authorization.dto.user.authorization.privileges';
import {
  AuthorizationPolicy,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AssignGlobalAdminInput } from './dto/authorization.dto.assign.global.admin';
import { RemoveGlobalAdminInput } from './dto/authorization.dto.remove.global.admin';
import { AssignGlobalCommunityAdminInput } from './dto/authorization.dto.assign.global.community.admin';
import { RemoveGlobalCommunityAdminInput } from './dto/authorization.dto.remove.global.community.admin';

@Injectable()
export class AuthorizationService {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private readonly agentService: AgentService,
    private readonly userService: UserService,
    @InjectRepository(AuthorizationPolicy)
    private authorizationPolicyRepository: Repository<AuthorizationPolicy>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async grantCredential(
    grantCredentialData: GrantAuthorizationCredentialInput
  ): Promise<IUser> {
    if (grantCredentialData.type === AuthorizationCredential.GLOBAL_ADMIN) {
      return await this.assignGlobalAdmin({
        userID: grantCredentialData.userID,
      });
    }
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

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: grantCredentialData.type,
      resourceID: grantCredentialData.resourceID,
    });
    return user;
  }

  async revokeCredential(
    revokeCredentialData: RevokeAuthorizationCredentialInput
  ): Promise<IUser> {
    if (revokeCredentialData.type === AuthorizationCredential.GLOBAL_ADMIN) {
      return await this.removeGlobalAdmin({
        userID: revokeCredentialData.userID,
      });
    }
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

    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: revokeCredentialData.type,
      resourceID: revokeCredentialData.resourceID,
    });

    return user;
  }

  async assignGlobalAdmin(assignData: AssignGlobalAdminInput): Promise<IUser> {
    const agent = await this.userService.getAgent(assignData.userID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(assignData.userID);
  }

  async removeGlobalAdmin(removeData: RemoveGlobalAdminInput): Promise<IUser> {
    const agent = await this.userService.getAgent(removeData.userID);

    // Check not the last global admin
    await this.removeValidationSingleGlobalAdmin();

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async assignGlobalCommunityAdmin(
    assignData: AssignGlobalCommunityAdminInput
  ): Promise<IUser> {
    const agent = await this.userService.getAgent(assignData.userID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(assignData.userID);
  }

  async removeGlobalCommunityAdmin(
    removeData: RemoveGlobalCommunityAdminInput
  ): Promise<IUser> {
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async removeValidationSingleGlobalAdmin(): Promise<boolean> {
    // Check more than one
    const globalAdmins = await this.usersWithCredentials({
      type: AuthorizationCredential.GLOBAL_ADMIN,
    });
    if (globalAdmins.length < 2)
      throw new ForbiddenException(
        `Not allowed to remove ${AuthorizationCredential.GLOBAL_ADMIN}: last global-admin`,
        LogContext.AUTH
      );

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

    const authorizationPolicy = await this.getAuthorizationPolicyOrFail(
      userAuthorizationPrivilegesData.authorizationID
    );

    const privileges = await this.authorizationEngine.getGrantedPrivileges(
      credentials,
      authorizationPolicy
    );
    return privileges;
  }

  async getAuthorizationPolicyOrFail(
    authorizationID: string
  ): Promise<IAuthorizationPolicy> {
    const authorizationPolicy =
      await this.authorizationPolicyRepository.findOne({
        id: authorizationID,
      });
    if (!authorizationPolicy)
      throw new EntityNotFoundException(
        `Not able to locate Authorization Policy with the specified ID: ${authorizationID}`,
        LogContext.CHALLENGES
      );
    return authorizationPolicy;
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
