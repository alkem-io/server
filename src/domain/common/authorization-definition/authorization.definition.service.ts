import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationDefinition } from '@domain/common/authorization-definition/authorization.definition.entity';
import { IAuthorizationDefinition } from './authorization.definition.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CredentialsSearchInput } from '@domain/agent/credential/credentials.dto.search';
import { AuthorizationRuleCredential } from './authorization.rule.credential';
import { UpdateAuthorizationDefinitionInput } from './authorization.definition.dto.update';
import { AuthorizationRuleVerifiedCredential } from './authorization.rule.verified.credential';
import { IAuthorizationRuleCredential } from './authorization.rule.credential.interface';

@Injectable()
export class AuthorizationDefinitionService {
  constructor(
    @InjectRepository(AuthorizationDefinition)
    private authorizationDefinitionRepository: Repository<
      AuthorizationDefinition
    >,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createAuthorizationDefinition(): Promise<IAuthorizationDefinition> {
    const authorization = new AuthorizationDefinition();
    return await this.authorizationDefinitionRepository.save(authorization);
  }

  async getAuthorizationDefinitionOrFail(
    AuthorizationDefinitionID: string
  ): Promise<AuthorizationDefinition> {
    const authorizationDefinition = await this.authorizationDefinitionRepository.findOne(
      {
        id: AuthorizationDefinitionID,
      }
    );
    if (!authorizationDefinition)
      throw new EntityNotFoundException(
        `Not able to locate AuthorizationDefinition with the specified ID: ${AuthorizationDefinitionID}`,
        LogContext.AUTH
      );
    return authorizationDefinition;
  }

  async delete(
    authorizationDefinition: IAuthorizationDefinition
  ): Promise<AuthorizationDefinition> {
    return await this.authorizationDefinitionRepository.remove(
      authorizationDefinition as AuthorizationDefinition
    );
  }

  validateAuthorization(
    authorization: IAuthorizationDefinition | undefined
  ): IAuthorizationDefinition {
    if (!authorization)
      throw new ForbiddenException(
        'Authorization: no definition provided',
        LogContext.AUTH
      );
    return authorization;
  }

  appendCredentialAuthorizationRule(
    authorization: IAuthorizationDefinition | undefined,
    credentialCriteria: CredentialsSearchInput,
    privileges: AuthorizationPrivilege[]
  ): IAuthorizationDefinition {
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
    authorization: IAuthorizationDefinition | undefined,
    newValue: boolean
  ): IAuthorizationDefinition {
    const auth = this.validateAuthorization(authorization);
    auth.anonymousReadAccess = newValue;
    return auth;
  }

  inheritParentAuthorization(
    childAuthorization: IAuthorizationDefinition | undefined,
    parentAuthorization: IAuthorizationDefinition | undefined
  ): IAuthorizationDefinition {
    const child = this.validateAuthorization(childAuthorization);
    const parent = this.validateAuthorization(parentAuthorization);
    const newRules = this.convertCredentialRulesStr(parent.credentialRules);
    this.appendCredentialAuthorizationRules(child, newRules);
    child.anonymousReadAccess = parent.anonymousReadAccess;
    return child;
  }

  updateAuthorization(
    origAuthorization: IAuthorizationDefinition | undefined,
    authorizationUpdateData: UpdateAuthorizationDefinitionInput
  ): IAuthorizationDefinition {
    const authorization = this.validateAuthorization(origAuthorization);
    authorization.anonymousReadAccess =
      authorizationUpdateData.anonymousReadAccess;
    return authorization;
  }

  appendCredentialAuthorizationRules(
    authorization: IAuthorizationDefinition | undefined,
    additionalRules: AuthorizationRuleCredential[]
  ): IAuthorizationDefinition {
    const auth = this.validateAuthorization(authorization);

    const existingRules = this.convertCredentialRulesStr(auth.credentialRules);
    for (const additionalRule of additionalRules) {
      existingRules.push(additionalRule);
    }

    auth.credentialRules = JSON.stringify(existingRules);
    return auth;
  }

  getCredentialRules(
    authorization: IAuthorizationDefinition
  ): IAuthorizationRuleCredential[] {
    return this.convertCredentialRulesStr(authorization.credentialRules);
  }

  getVerifiedCredentialRules(
    authorization: IAuthorizationDefinition
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
