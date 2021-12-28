import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationRoleGlobal,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CredentialsSearchInput } from '@domain/agent/credential/credentials.dto.search';
import { IAuthorizationPolicyRuleCredential } from '../../../core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication/agent-info';

@Injectable()
export class AuthorizationPolicyService {
  constructor(
    @InjectRepository(AuthorizationPolicy)
    private authorizationPolicyRepository: Repository<AuthorizationPolicy>,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  reset(
    authorizationPolicy: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorizationPolicy) {
      throw new RelationshipNotFoundException(
        'Undefined Authorization Policy supplied',
        LogContext.AUTH
      );
    }
    authorizationPolicy.credentialRules = '';
    return authorizationPolicy;
  }

  async getAuthorizationPolicyOrFail(
    authorizationPolicyID: string
  ): Promise<IAuthorizationPolicy> {
    const authorizationPolicy =
      await this.authorizationPolicyRepository.findOne({
        id: authorizationPolicyID,
      });
    if (!authorizationPolicy)
      throw new EntityNotFoundException(
        `Not able to locate Authorization Policy with the specified ID: ${authorizationPolicyID}`,
        LogContext.AUTH
      );
    return authorizationPolicy;
  }

  async delete(
    authorizationPolicy: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    return await this.authorizationPolicyRepository.remove(
      authorizationPolicy as AuthorizationPolicy
    );
  }

  validateAuthorization(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new ForbiddenException(
        'Authorization: no definition provided',
        LogContext.AUTH
      );
    return authorization;
  }

  appendCredentialAuthorizationRule(
    authorization: IAuthorizationPolicy | undefined,
    credentialCriteria: CredentialsSearchInput,
    privileges: AuthorizationPrivilege[]
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);
    const rules = this.authorizationService.convertCredentialRulesStr(
      auth.credentialRules
    );
    const newRule: AuthorizationPolicyRuleCredential = {
      type: credentialCriteria.type,
      resourceID: credentialCriteria.resourceID || '',
      grantedPrivileges: privileges,
    };
    rules.push(newRule);
    auth.credentialRules = JSON.stringify(rules);
    return auth;
  }

  setAnonymousAccess(
    authorization: IAuthorizationPolicy | undefined,
    newValue: boolean
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);
    auth.anonymousReadAccess = newValue;
    return auth;
  }

  inheritParentAuthorization(
    childAuthorization: IAuthorizationPolicy | undefined,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    // create a new child definition if one is not provided, a temporary fix
    let child = childAuthorization;
    if (!child) {
      child = new AuthorizationPolicy();
    }
    const parent = this.validateAuthorization(parentAuthorization);
    // Reset the child to a base state for authorization definition
    this.reset(child);
    const newRules = this.authorizationService.convertCredentialRulesStr(
      parent.credentialRules
    );
    this.appendCredentialAuthorizationRules(child, newRules);
    child.anonymousReadAccess = parent.anonymousReadAccess;
    return child;
  }

  appendCredentialAuthorizationRules(
    authorization: IAuthorizationPolicy | undefined,
    additionalRules: AuthorizationPolicyRuleCredential[]
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);

    const existingRules = this.authorizationService.convertCredentialRulesStr(
      auth.credentialRules
    );
    for (const additionalRule of additionalRules) {
      if (additionalRule.inheritable) {
        existingRules.push(additionalRule);
      }
    }

    auth.credentialRules = JSON.stringify(existingRules);
    return auth;
  }

  getCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    return this.authorizationService.convertCredentialRulesStr(
      authorization.credentialRules
    );
  }

  getVerifiedCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    return this.authorizationService.convertVerifiedCredentialRulesStr(
      authorization.verifiedCredentialRules
    );
  }

  createGlobalRolesAuthorizationPolicy(
    globalRoles: AuthorizationRoleGlobal[],
    privileges: AuthorizationPrivilege[]
  ): IAuthorizationPolicy {
    const authorization = new AuthorizationPolicy();
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    for (const globalRole of globalRoles) {
      let credType: AuthorizationCredential;
      if (globalRole === AuthorizationRoleGlobal.ADMIN) {
        credType = AuthorizationCredential.GLOBAL_ADMIN;
      } else if (globalRole === AuthorizationRoleGlobal.COMMUNITY_ADMIN) {
        credType = AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY;
      } else if (globalRole === AuthorizationRoleGlobal.REGISTERED) {
        credType = AuthorizationCredential.GLOBAL_REGISTERED;
      } else {
        throw new ForbiddenException(
          `Authorization: invalid global role encountered: ${globalRole}`,
          LogContext.AUTH
        );
      }
      const roleCred = {
        type: credType,
        resourceID: '',
        grantedPrivileges: privileges,
      };
      newRules.push(roleCred);
    }
    this.appendCredentialAuthorizationRules(authorization, newRules);

    return authorization;
  }

  getAgentPrivileges(
    agentInfo: AgentInfo,
    authorizationPolicy: IAuthorizationPolicy
  ): AuthorizationPrivilege[] {
    if (!agentInfo || !agentInfo.credentials) return [];

    return this.authorizationService.getGrantedPrivileges(
      agentInfo.credentials,
      authorizationPolicy
    );
  }
}
