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
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { IAuthorizationPolicyRuleCredential } from '../../../core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { IAuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege.interface';
import { IAuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential.interface';

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
    authorizationPolicy.verifiedCredentialRules = '';
    authorizationPolicy.privilegeRules = '';
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

  async save(
    authorizationPolicy: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    return await this.authorizationPolicyRepository.save(authorizationPolicy);
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
    grantedPrivileges: AuthorizationPrivilege[]
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);
    const rules = this.authorizationService.convertCredentialRulesStr(
      auth.credentialRules
    );
    const newRule = new AuthorizationPolicyRuleCredential(
      grantedPrivileges,
      credentialCriteria.type,
      credentialCriteria.resourceID
    );
    rules.push(newRule);
    auth.credentialRules = JSON.stringify(rules);
    return auth;
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
      existingRules.push(additionalRule);
    }

    auth.credentialRules = JSON.stringify(existingRules);
    return auth;
  }

  appendPrivilegeAuthorizationRules(
    authorization: IAuthorizationPolicy | undefined,
    privilegeRules: AuthorizationPolicyRulePrivilege[]
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);
    const existingRules = this.authorizationService.convertPrivilegeRulesStr(
      auth.privilegeRules
    );
    for (const additionalRule of privilegeRules) {
      existingRules.push(additionalRule);
    }
    auth.privilegeRules = JSON.stringify(existingRules);
    return auth;
  }

  appendVerifiedCredentialAuthorizationRules(
    authorization: IAuthorizationPolicy | undefined,
    additionalRules: AuthorizationPolicyRuleVerifiedCredential[]
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);

    const existingRules =
      this.authorizationService.convertVerifiedCredentialRulesStr(
        auth.verifiedCredentialRules
      );
    for (const additionalRule of additionalRules) {
      existingRules.push(additionalRule);
    }

    auth.verifiedCredentialRules = JSON.stringify(existingRules);
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
    // TODO: remove this
    // create a new child definition if one is not provided, a temporary fix
    let child = childAuthorization;
    if (!child) {
      child = new AuthorizationPolicy();
    }
    const parent = this.validateAuthorization(parentAuthorization);
    const resetAuthPolicy = this.reset(child);
    // (a) Inherit the visibility
    resetAuthPolicy.anonymousReadAccess = parent.anonymousReadAccess;
    // (b) Inherit the credential rules
    const inheritedRules = this.authorizationService.convertCredentialRulesStr(
      parent.credentialRules
    );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    for (const inheritedRule of inheritedRules) {
      if (inheritedRule.inheritable) {
        newRules.push(inheritedRule);
      }
    }
    resetAuthPolicy.credentialRules = JSON.stringify(newRules);

    // (c) Inherit the verified credential rules
    const inheritedVCRules =
      this.authorizationService.convertVerifiedCredentialRulesStr(
        parent.verifiedCredentialRules
      );
    const newVcRules: IAuthorizationPolicyRuleVerifiedCredential[] = [];
    for (const inheritedVcRule of inheritedVCRules) {
      newVcRules.push(inheritedVcRule);
    }
    resetAuthPolicy.verifiedCredentialRules = JSON.stringify(newVcRules);

    return resetAuthPolicy;
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
  ): IAuthorizationPolicyRuleVerifiedCredential[] {
    const result = this.authorizationService.convertVerifiedCredentialRulesStr(
      authorization.verifiedCredentialRules
    );
    return result;
  }

  getPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRulePrivilege[] {
    const result = this.authorizationService.convertPrivilegeRulesStr(
      authorization.privilegeRules
    );
    return result;
  }

  getAgentPrivileges(
    agentInfo: AgentInfo,
    authorizationPolicy: IAuthorizationPolicy
  ): AuthorizationPrivilege[] {
    if (!agentInfo || !agentInfo.credentials) return [];

    return this.authorizationService.getGrantedPrivileges(
      agentInfo.credentials,
      agentInfo.verifiedCredentials,
      authorizationPolicy
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
      switch (globalRole) {
        case AuthorizationRoleGlobal.GLOBAL_ADMIN:
          credType = AuthorizationCredential.GLOBAL_ADMIN;
          break;
        case AuthorizationRoleGlobal.GLOBAL_COMMUNITY_ADMIN:
          credType = AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY;
          break;
        case AuthorizationRoleGlobal.GLOBAL_ADMIN_HUBS:
          credType = AuthorizationCredential.GLOBAL_ADMIN_HUBS;
          break;
        default:
          throw new ForbiddenException(
            `Authorization: invalid global role encountered: ${globalRole}`,
            LogContext.AUTH
          );
      }

      const roleCred = new AuthorizationPolicyRuleCredential(
        privileges,
        credType
      );

      newRules.push(roleCred);
    }
    this.appendCredentialAuthorizationRules(authorization, newRules);

    return authorization;
  }
}
