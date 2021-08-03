import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationDefinition } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CredentialsSearchInput } from '@domain/agent/credential/credentials.dto.search';
import { AuthorizationRuleCredential } from './authorization.rule.credential';
import { UpdateAuthorizationPolicyInput } from './authorization.policy.dto.update';
import { AuthorizationRuleVerifiedCredential } from './authorization.rule.verified.credential';
import { IAuthorizationRuleCredential } from './authorization.rule.credential.interface';

@Injectable()
export class AuthorizationPolicyService {
  constructor(
    @InjectRepository(AuthorizationDefinition)
    private authorizationDefinitionRepository: Repository<AuthorizationDefinition>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  reset(
    authorizationDefinition: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorizationDefinition) {
      throw new RelationshipNotFoundException(
        'Undefined AuthorizationDefinition supplied',
        LogContext.AUTH
      );
    }
    authorizationDefinition.credentialRules = '';
    return authorizationDefinition;
  }

  async getAuthorizationDefinitionOrFail(
    AuthorizationDefinitionID: string
  ): Promise<AuthorizationDefinition> {
    const authorizationDefinition =
      await this.authorizationDefinitionRepository.findOne({
        id: AuthorizationDefinitionID,
      });
    if (!authorizationDefinition)
      throw new EntityNotFoundException(
        `Not able to locate AuthorizationDefinition with the specified ID: ${AuthorizationDefinitionID}`,
        LogContext.AUTH
      );
    return authorizationDefinition;
  }

  async delete(
    authorizationDefinition: IAuthorizationPolicy
  ): Promise<AuthorizationDefinition> {
    return await this.authorizationDefinitionRepository.remove(
      authorizationDefinition as AuthorizationDefinition
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
    const rules = this.convertCredentialRulesStr(auth.credentialRules);
    const newRule: AuthorizationRuleCredential = {
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
      child = new AuthorizationDefinition();
    }
    const parent = this.validateAuthorization(parentAuthorization);
    // Reset the child to a base state for authorization definition
    this.reset(child);
    const newRules = this.convertCredentialRulesStr(parent.credentialRules);
    this.appendCredentialAuthorizationRules(child, newRules);
    child.anonymousReadAccess = parent.anonymousReadAccess;
    return child;
  }

  updateAuthorization(
    origAuthorization: IAuthorizationPolicy | undefined,
    authorizationUpdateData: UpdateAuthorizationPolicyInput
  ): IAuthorizationPolicy {
    const authorization = this.validateAuthorization(origAuthorization);
    authorization.anonymousReadAccess =
      authorizationUpdateData.anonymousReadAccess;
    return authorization;
  }

  appendCredentialAuthorizationRules(
    authorization: IAuthorizationPolicy | undefined,
    additionalRules: AuthorizationRuleCredential[]
  ): IAuthorizationPolicy {
    const auth = this.validateAuthorization(authorization);

    const existingRules = this.convertCredentialRulesStr(auth.credentialRules);
    for (const additionalRule of additionalRules) {
      existingRules.push(additionalRule);
    }

    auth.credentialRules = JSON.stringify(existingRules);
    return auth;
  }

  getCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationRuleCredential[] {
    return this.convertCredentialRulesStr(authorization.credentialRules);
  }

  getVerifiedCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationRuleCredential[] {
    return this.convertVerifiedCredentialRulesStr(
      authorization.verifiedCredentialRules
    );
  }

  convertCredentialRulesStr(rulesStr: string): AuthorizationRuleCredential[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      const rules: AuthorizationRuleCredential[] = JSON.parse(rulesStr);
      return rules;
    } catch (error) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }

  convertVerifiedCredentialRulesStr(
    rulesStr: string
  ): AuthorizationRuleVerifiedCredential[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      const rules: AuthorizationRuleVerifiedCredential[] = JSON.parse(rulesStr);
      return rules;
    } catch (error) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }
}
