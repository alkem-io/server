import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationRoleGlobal,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOptionsSelect, Repository } from 'typeorm';
import { IAuthorizationPolicyRuleCredential } from '../../../core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from './authorization.policy.interface';

@Injectable()
export class AuthorizationPolicyService {
  private readonly authChunkSize: number;
  constructor(
    @InjectRepository(AuthorizationPolicy)
    private authorizationPolicyRepository: Repository<AuthorizationPolicy>,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.authChunkSize = this.configService.get('authorization.chunk', {
      infer: true,
    });
  }

  public authorizationSelectOptions: FindOptionsSelect<AuthorizationPolicy> = {
    id: true,
    credentialRules: true,
    privilegeRules: true,
  };

  createCredentialRule(
    grantedPrivileges: AuthorizationPrivilege[],
    criterias: ICredentialDefinition[],
    name: string
  ): IAuthorizationPolicyRuleCredential {
    return {
      grantedPrivileges,
      criterias,
      cascade: true,
      name,
    };
  }

  createCredentialRuleUsingTypesOnly(
    grantedPrivileges: AuthorizationPrivilege[],
    credentialTypes: AuthorizationCredential[],
    name: string
  ): IAuthorizationPolicyRuleCredential {
    const criterias: ICredentialDefinition[] = [];

    for (const credentialType of credentialTypes) {
      const criteria: ICredentialDefinition = {
        type: credentialType,
        resourceID: '',
      };

      criterias.push(criteria);
    }

    return {
      grantedPrivileges,
      criterias,
      cascade: true,
      name,
    };
  }

  private createCredentialRuleGlobalAdmins(
    grantedPrivileges: AuthorizationPrivilege[],
    globalRoles: AuthorizationRoleGlobal[],
    name: string
  ): IAuthorizationPolicyRuleCredential {
    const criterias: ICredentialDefinition[] = [];

    for (const globalRole of globalRoles) {
      let credType: AuthorizationCredential;
      switch (globalRole) {
        case AuthorizationRoleGlobal.GLOBAL_ADMIN:
          credType = AuthorizationCredential.GLOBAL_ADMIN;
          break;
        case AuthorizationRoleGlobal.GLOBAL_COMMUNITY_READ:
          credType = AuthorizationCredential.GLOBAL_COMMUNITY_READ;
          break;
        case AuthorizationRoleGlobal.GLOBAL_SUPPORT:
          credType = AuthorizationCredential.GLOBAL_SUPPORT;
          break;
        default:
          throw new ForbiddenException(
            `Authorization: invalid global role encountered: ${globalRole}`,
            LogContext.AUTH
          );
      }

      const criteria: ICredentialDefinition = {
        type: credType,
        resourceID: '',
      };

      criterias.push(criteria);
    }

    return {
      grantedPrivileges,
      criterias,
      cascade: true,
      name,
    };
  }

  createGlobalRolesAuthorizationPolicy(
    globalRoles: AuthorizationRoleGlobal[],
    privileges: AuthorizationPrivilege[],
    name: string
  ): IAuthorizationPolicy {
    const authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.IN_MEMORY
    );
    const rule = this.createCredentialRuleGlobalAdmins(
      privileges,
      globalRoles,
      name
    );

    const rules = [rule];
    this.appendCredentialAuthorizationRules(authorization, rules);

    return authorization;
  }

  public reset(
    authorizationPolicy: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorizationPolicy) {
      throw new RelationshipNotFoundException(
        'Undefined Authorization Policy supplied',
        LogContext.AUTH
      );
    }
    authorizationPolicy.credentialRules = [];
    authorizationPolicy.privilegeRules = [];
    return authorizationPolicy;
  }

  async getAuthorizationPolicyOrFail(
    authorizationPolicyID: string
  ): Promise<IAuthorizationPolicy> {
    const authorizationPolicy =
      await this.authorizationPolicyRepository.findOneBy({
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
    return this.authorizationPolicyRepository.save(authorizationPolicy);
  }

  async saveAll(authorizationPolicies: IAuthorizationPolicy[]): Promise<void> {
    if (authorizationPolicies.length > 500)
      this.logger.warn?.(
        `Saving ${authorizationPolicies.length} authorization policies of type ${authorizationPolicies[0].type}`,
        LogContext.AUTH
      );
    else {
      this.logger.verbose?.(
        `Saving ${authorizationPolicies.length} authorization policies`,
        LogContext.AUTH
      );
    }

    await this.authorizationPolicyRepository.save(authorizationPolicies, {
      chunk: this.authChunkSize,
    });
  }

  cloneAuthorizationPolicy(
    originalAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    this.validateAuthorization(originalAuthorization);
    const clonedAuthorization: IAuthorizationPolicy = JSON.parse(
      JSON.stringify(originalAuthorization)
    );
    return clonedAuthorization;
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
    grantedPrivileges: AuthorizationPrivilege[],
    name: string
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);
    const rules = auth.credentialRules;
    const newRule = new AuthorizationPolicyRuleCredential(
      grantedPrivileges,
      [
        {
          type: credentialCriteria.type,
          resourceID: credentialCriteria.resourceID || '',
        },
      ],
      name
    );
    rules.push(newRule);
    auth.credentialRules = rules;
    return auth;
  }

  public appendCredentialRuleRegisteredAccess(
    authorization: IAuthorizationPolicy | undefined,
    privilege: AuthorizationPrivilege,
    cascade = true
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);

    const newRule = this.createCredentialRuleUsingTypesOnly(
      [privilege],
      [AuthorizationCredential.GLOBAL_REGISTERED],
      `Anonymous agent granted '${privilege}' registered access`
    );
    newRule.cascade = cascade;
    auth.credentialRules.push(newRule);
    return auth;
  }

  public appendCredentialRuleAnonymousAccess(
    authorization: IAuthorizationPolicy | undefined,
    privilege: AuthorizationPrivilege,
    cascade = true
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);

    const newRule = this.createCredentialRuleUsingTypesOnly(
      [privilege],
      [AuthorizationCredential.GLOBAL_ANONYMOUS],
      `Anonymous agent granted '${privilege}' anonymous access`
    );
    newRule.cascade = cascade;
    auth.credentialRules.push(newRule);
    return auth;
  }

  /**
   * Returns GLOBAL_ANONYMOUS and GLOBAL_REGISTERED credential definitions.
   */
  public getCredentialDefinitionsAnonymousRegistered(): ICredentialDefinition[] {
    return [
      { type: AuthorizationCredential.GLOBAL_ANONYMOUS, resourceID: '' },
      { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
    ];
  }

  public appendCredentialRuleAnonymousRegisteredAccess(
    authorization: IAuthorizationPolicy | undefined,
    privilege: AuthorizationPrivilege,
    cascade = true
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);

    const newRule = this.createCredentialRuleUsingTypesOnly(
      [privilege],
      [
        AuthorizationCredential.GLOBAL_ANONYMOUS,
        AuthorizationCredential.GLOBAL_REGISTERED,
      ],
      `Anonymous agent granted '${privilege}' anonymous registered access`
    );
    newRule.cascade = cascade;
    auth.credentialRules.push(newRule);
    return auth;
  }

  appendCredentialAuthorizationRules(
    authorization: IAuthorizationPolicy | undefined,
    additionalRules: IAuthorizationPolicyRuleCredential[]
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);

    const existingRules = auth.credentialRules;
    for (const additionalRule of additionalRules) {
      existingRules.push(additionalRule);
    }

    auth.credentialRules = existingRules;
    return auth;
  }

  appendPrivilegeAuthorizationRules(
    authorization: IAuthorizationPolicy | undefined,
    privilegeRules: IAuthorizationPolicyRulePrivilege[]
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);
    const existingRules = auth.privilegeRules;
    for (const additionalRule of privilegeRules) {
      existingRules.push(additionalRule);
    }
    auth.privilegeRules = existingRules;
    return auth;
  }

  public appendPrivilegeAuthorizationRuleMapping(
    authorization: IAuthorizationPolicy | undefined,
    sourcePrivilege: AuthorizationPrivilege,
    grantedPrivileges: AuthorizationPrivilege[],
    name: string
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);
    const existingRules = auth.privilegeRules;
    const newPrivilegeRule = new AuthorizationPolicyRulePrivilege(
      grantedPrivileges,
      sourcePrivilege,
      name
    );
    existingRules.push(newPrivilegeRule);

    auth.privilegeRules = existingRules;
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
      this.logger.error(
        `Encountered undefined child authorization policy, parent authorization: ${JSON.stringify(
          parentAuthorization
        )}`,
        LogContext.AUTH
      );
      child = new AuthorizationPolicy(AuthorizationPolicyType.UNKNOWN);
    }
    const parent = this.validateAuthorization(parentAuthorization);
    const resetAuthPolicy = this.reset(child);

    // If the parent has a pre-resolved InheritedCredentialRuleSet (via resolveForParent()),
    // assign it to the child via FK — child's credentialRules stays empty (local rules added later by callers).
    if (parent._childInheritedCredentialRuleSet) {
      resetAuthPolicy.inheritedCredentialRuleSet =
        parent._childInheritedCredentialRuleSet;
      return resetAuthPolicy;
    }

    // Fallback: copy cascading rules directly (backward compat during transition)
    const inheritedRules = parent.credentialRules;

    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    for (const inheritedRule of inheritedRules) {
      if (inheritedRule.cascade) {
        newRules.push(inheritedRule);
      }
    }
    resetAuthPolicy.credentialRules = newRules;

    return resetAuthPolicy;
  }

  getCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    return authorization.credentialRules;
  }

  getPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRulePrivilege[] {
    return authorization.privilegeRules ?? [];
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
