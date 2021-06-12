import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CredentialsSearchInput } from '@domain/agent';
import { AuthorizationRuleCredential } from './authorization.rule.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenException } from '@common/exceptions';
import {
  AuthorizationCredential,
  AuthorizationRoleGlobal,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import {
  AuthorizationDefinition,
  IAuthorizationDefinition,
} from '@domain/common/authorization-definition';
import { AgentInfo } from '@core/authentication';
import { ConfigService } from '@nestjs/config';
import { AuthorizationRuleVerifiedCredential } from './authorization.rule.verified.credential';

@Injectable()
export class AuthorizationEngineService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {}

  grantAccessOrFail(
    agentInfo: AgentInfo,
    authorization: IAuthorizationDefinition | undefined,
    privilegeRequired: AuthorizationPrivilege,
    msg: string
  ) {
    if (this.isAuthenticationDisabled()) return true;

    const auth = this.validateAuthorization(authorization);
    if (this.isAccessGranted(agentInfo, auth, privilegeRequired)) return true;

    const errorMsg = `Authorization: unable to grant '${privilegeRequired}' privilege: ${msg}`;
    this.logCredentialCheckFailDetails(errorMsg, agentInfo, auth);

    // If get to here then no match was found
    throw new ForbiddenException(errorMsg, LogContext.AUTH);
  }

  grantReadAccessOrFail(
    agentInfo: AgentInfo,
    authorization: IAuthorizationDefinition | undefined,
    msg: string
  ) {
    this.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.READ,
      msg
    );
  }

  logCredentialCheckFailDetails(
    errorMsg: string,
    agentInfo: AgentInfo,
    authorization: IAuthorizationDefinition
  ) {
    const msg = `${errorMsg}; agentInfo: ${
      agentInfo.email
    } has credentials '${JSON.stringify(
      agentInfo.credentials,
      this.replacer
    )}'; authorization definition: anonymousAccess=${
      authorization?.anonymousReadAccess
    } & rules: ${authorization?.credentialRules}`;
    //console.log(msg);
    this.logger.verbose?.(msg, LogContext.AUTH);
  }

  logAgentInfo(agentInfo: AgentInfo) {
    this.logger.verbose?.(
      `AgentInfo: '${agentInfo.email}' has credentials '${JSON.stringify(
        agentInfo.credentials,
        this.replacer
      )}'`,
      LogContext.AUTH
    );
  }

  // Utility function to avoid having a bunch of fields that are not relevant on log output for credentials logging.
  replacer = (key: any, value: any) => {
    if (key == 'createdDate') return undefined;
    else if (key == 'updatedDate') return undefined;
    else if (key == 'version') return undefined;
    else if (key == 'id') return undefined;
    else return value;
  };

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

  isAuthenticationDisabled(): boolean {
    const authEnabled = this.configService.get(ConfigurationTypes.Identity)
      ?.authentication?.enabled;
    if (!authEnabled) return true;
    return false;
  }

  isAccessGranted(
    agentInfo: AgentInfo,
    authorization: IAuthorizationDefinition,
    privilegeRequired: AuthorizationPrivilege
  ): boolean {
    if (this.isAuthenticationDisabled()) return true;
    if (
      authorization.anonymousReadAccess &&
      privilegeRequired === AuthorizationPrivilege.READ
    )
      return true;

    const credentialRules: AuthorizationRuleCredential[] = this.convertCredentialRulesStr(
      authorization.credentialRules
    );
    for (const rule of credentialRules) {
      for (const credential of agentInfo.credentials) {
        if (
          credential.type === rule.type &&
          credential.resourceID === rule.resourceID
        ) {
          for (const privilege of rule.grantedPrivileges) {
            if (privilege === privilegeRequired) return true;
          }
        }
      }
    }
    const verifiedCredentialRules: AuthorizationRuleVerifiedCredential[] = this.convertVerifiedCredentialRulesStr(
      authorization.verifiedCredentialRules
    );
    for (const rule of verifiedCredentialRules) {
      for (const verifiedCredential of agentInfo.verifiedCredentials) {
        if (
          verifiedCredential.type === rule.type &&
          verifiedCredential.issuer === rule.resourceID
        ) {
          for (const privilege of rule.grantedPrivileges) {
            if (privilege === privilegeRequired) {
              this.logger.warn?.(
                `Authorization engine: granting access for '${verifiedCredential.type}'`,
                LogContext.AUTH
              );
              return true;
            }
          }
        }
      }
    }
    return false;
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
      resourceID: credentialCriteria.type,
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

  createGlobalRolesAuthorizationDefinition(
    globalRoles: AuthorizationRoleGlobal[],
    privileges: AuthorizationPrivilege[]
  ): IAuthorizationDefinition {
    const authorization = new AuthorizationDefinition();
    const newRules: AuthorizationRuleCredential[] = [];

    for (const globalRole of globalRoles) {
      let credType: AuthorizationCredential;
      if (globalRole === AuthorizationRoleGlobal.Admin) {
        credType = AuthorizationCredential.GlobalAdmin;
      } else if (globalRole === AuthorizationRoleGlobal.CommunityAdmin) {
        credType = AuthorizationCredential.GlobalAdminCommunity;
      } else if (globalRole === AuthorizationRoleGlobal.Registered) {
        credType = AuthorizationCredential.GlobalRegistered;
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
}
