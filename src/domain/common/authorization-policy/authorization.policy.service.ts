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
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
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
import { AlkemioConfig } from '@src/types';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAuthorizationPolicyRuleCredential } from '../../../core/authorization/authorization.policy.rule.credential.interface';
import { authorizationPolicies } from './authorization.policy.schema';
import { IAuthorizationPolicy } from './authorization.policy.interface';

@Injectable()
export class AuthorizationPolicyService {
  private readonly authChunkSize: number;
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.authChunkSize = this.configService.get('authorization.chunk', {
      infer: true,
    });
  }

  /**
   * Column selection for authorization policies in relational queries.
   * Used by consuming services in Drizzle `with: { authorization: { columns: ... } }`.
   */
  public authorizationSelectOptions = {
    id: true as const,
    credentialRules: true as const,
    privilegeRules: true as const,
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
      await this.db.query.authorizationPolicies.findFirst({
        where: eq(authorizationPolicies.id, authorizationPolicyID),
      });
    if (!authorizationPolicy)
      throw new EntityNotFoundException(
        `Not able to locate Authorization Policy with the specified ID: ${authorizationPolicyID}`,
        LogContext.AUTH
      );
    return authorizationPolicy as unknown as IAuthorizationPolicy;
  }

  async delete(
    authorizationPolicy: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    await this.db
      .delete(authorizationPolicies)
      .where(eq(authorizationPolicies.id, authorizationPolicy.id));
    return authorizationPolicy;
  }

  async save(
    authorizationPolicy: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    if (authorizationPolicy.id) {
      const [result] = await this.db
        .update(authorizationPolicies)
        .set({
          credentialRules: authorizationPolicy.credentialRules,
          privilegeRules: authorizationPolicy.privilegeRules,
          type: authorizationPolicy.type,
        })
        .where(eq(authorizationPolicies.id, authorizationPolicy.id))
        .returning();
      return result as unknown as IAuthorizationPolicy;
    }
    const [result] = await this.db
      .insert(authorizationPolicies)
      .values({
        credentialRules: authorizationPolicy.credentialRules,
        privilegeRules: authorizationPolicy.privilegeRules,
        type: authorizationPolicy.type,
      })
      .returning();
    return result as unknown as IAuthorizationPolicy;
  }

  async saveAll(policies: IAuthorizationPolicy[]): Promise<void> {
    if (policies.length > 500)
      this.logger.warn?.(
        `Saving ${policies.length} authorization policies of type ${policies[0].type}`,
        LogContext.AUTH
      );
    else {
      this.logger.verbose?.(
        `Saving ${policies.length} authorization policies`,
        LogContext.AUTH
      );
    }

    for (let i = 0; i < policies.length; i += this.authChunkSize) {
      const chunk = policies.slice(i, i + this.authChunkSize);
      await Promise.all(
        chunk.map((policy) =>
          this.db
            .update(authorizationPolicies)
            .set({
              credentialRules: policy.credentialRules,
              privilegeRules: policy.privilegeRules,
              type: policy.type,
            })
            .where(eq(authorizationPolicies.id, policy.id))
        )
      );
    }
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

    // (a) Inherit the credential rules
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
