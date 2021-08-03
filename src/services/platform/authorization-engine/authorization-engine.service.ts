import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenException } from '@common/exceptions';
import {
  AuthorizationCredential,
  AuthorizationRoleGlobal,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { ConfigService } from '@nestjs/config';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationRuleCredential } from '@domain/common/authorization-policy/authorization.rule.credential';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationRuleVerifiedCredential } from '@domain/common/authorization-policy/authorization.rule.verified.credential';
import { AuthorizationDefinition } from '@domain/common/authorization-policy';

@Injectable()
export class AuthorizationEngineService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  grantAccessOrFail(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege,
    msg: string
  ) {
    if (this.isAuthenticationDisabled()) return true;

    const auth =
      this.authorizationPolicyService.validateAuthorization(authorization);
    if (this.isAccessGranted(agentInfo, auth, privilegeRequired)) return true;

    const errorMsg = `Authorization: unable to grant '${privilegeRequired}' privilege: ${msg}`;
    this.logCredentialCheckFailDetails(errorMsg, agentInfo, auth);

    // If get to here then no match was found
    throw new ForbiddenException(errorMsg, LogContext.AUTH);
  }

  grantReadAccessOrFail(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
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
    authorization: IAuthorizationPolicy
  ) {
    const msg = `${errorMsg}; agentInfo: ${
      agentInfo.email
    } has credentials '${JSON.stringify(
      agentInfo.credentials,
      this.replacer
    )}'; authorization definition: anonymousAccess=${
      authorization?.anonymousReadAccess
    } & rules: ${authorization?.credentialRules}`;
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

  isAuthenticationDisabled(): boolean {
    const authEnabled = this.configService.get(ConfigurationTypes.Identity)
      ?.authentication?.enabled;
    if (!authEnabled) return true;
    return false;
  }

  isAccessGranted(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege
  ): boolean {
    if (!authorization) throw new Error();
    if (this.isAuthenticationDisabled()) return true;
    if (
      authorization.anonymousReadAccess &&
      privilegeRequired === AuthorizationPrivilege.READ
    )
      return true;

    const credentialRules: AuthorizationRuleCredential[] =
      this.authorizationPolicyService.convertCredentialRulesStr(
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
    const verifiedCredentialRules: AuthorizationRuleVerifiedCredential[] =
      this.authorizationPolicyService.convertVerifiedCredentialRulesStr(
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

  getGrantedPrivileges(
    credentials: ICredential[],
    authorization: IAuthorizationPolicy
  ) {
    const grantedPrivileges: AuthorizationPrivilege[] = [];

    if (authorization.anonymousReadAccess) {
      grantedPrivileges.push(AuthorizationPrivilege.READ);
    }

    const credentialRules: AuthorizationRuleCredential[] =
      this.authorizationPolicyService.convertCredentialRulesStr(
        authorization.credentialRules
      );
    for (const rule of credentialRules) {
      for (const credential of credentials) {
        if (
          credential.type === rule.type &&
          credential.resourceID === rule.resourceID
        ) {
          for (const privilege of rule.grantedPrivileges) {
            grantedPrivileges.push(privilege);
          }
        }
      }
    }

    const uniquePrivileges = grantedPrivileges.filter(
      (item, i, ar) => ar.indexOf(item) === i
    );

    return uniquePrivileges;
  }

  createGlobalRolesAuthorizationPolicy(
    globalRoles: AuthorizationRoleGlobal[],
    privileges: AuthorizationPrivilege[]
  ): IAuthorizationPolicy {
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
    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
