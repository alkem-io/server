import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyRulePrivilege } from './authorization.policy.rule.privilege';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';
import { IAuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential.interface';
import { IAuthorizationPolicyRuleVerifiedCredential } from './authorization.policy.rule.verified.credential.interface';
import { AuthorizationInvalidPolicyException } from '@common/exceptions/authorization.invalid.policy.exception copy';
import { IAuthorizationPolicyRulePrivilege } from './authorization.policy.rule.privilege.interface';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  grantAccessOrFail(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege,
    msg: string
  ) {
    const auth = this.validateAuthorization(authorization);

    throw new ForbiddenAuthorizationPolicyException(
      'grantAccessOrFail',
      privilegeRequired,
      auth.id,
      agentInfo.userID
    );
    if (this.isAccessGranted(agentInfo, auth, privilegeRequired)) return true;

    const errorMsg = `Authorization: unable to grant '${privilegeRequired}' privilege: ${msg} user: ${agentInfo.userID}`;
    this.logCredentialCheckFailDetails(errorMsg, agentInfo, auth);

    // If get to here then no match was found
    throw new ForbiddenAuthorizationPolicyException(
      errorMsg,
      privilegeRequired,
      auth.id,
      agentInfo.userID
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
    this.logger.verbose?.(msg, LogContext.AUTH_POLICY);
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
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new ForbiddenException(
        'Authorization: no definition provided',
        LogContext.AUTH_POLICY
      );
    return authorization;
  }

  isAccessGranted(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege
  ): boolean {
    if (!authorization) {
      throw new ForbiddenException(
        'Authorization: no definition provided',
        LogContext.AUTH_POLICY
      );
    }
    if (
      authorization.anonymousReadAccess &&
      privilegeRequired === AuthorizationPrivilege.READ
    ) {
      this.logger.verbose?.(
        `Granted privilege '${privilegeRequired}' using rule 'AnonymousReadAccess'`,
        LogContext.AUTH_POLICY
      );
      return true;
    }

    // Keep track of all the granted privileges via Credential rules so can use with Privilege rules
    const grantedPrivileges: AuthorizationPrivilege[] = [];

    const credentialRules = this.convertCredentialRulesStr(
      authorization.credentialRules
    );
    for (const rule of credentialRules) {
      for (const credential of agentInfo.credentials) {
        if (this.isCredentialMatch(credential, rule)) {
          for (const privilege of rule.grantedPrivileges) {
            if (privilege === privilegeRequired) {
              this.logger.verbose?.(
                `[CredentialRule] Granted privilege '${privilegeRequired}' using rule '${rule.name}'`,
                LogContext.AUTH_POLICY
              );
              return true;
            }
            grantedPrivileges.push(privilege);
          }
        }
      }
    }
    const verifiedCredentialRules: IAuthorizationPolicyRuleVerifiedCredential[] =
      this.convertVerifiedCredentialRulesStr(
        authorization.verifiedCredentialRules
      );
    for (const rule of verifiedCredentialRules) {
      for (const verifiedCredential of agentInfo.verifiedCredentials) {
        const isMatch = this.isVerifiedCredentialMatch(
          verifiedCredential,
          rule
        );
        if (isMatch) {
          for (const privilege of rule.grantedPrivileges) {
            if (privilege === privilegeRequired) {
              this.logger.verbose?.(
                `[VerifiedCredentialRule] Access granted based on VC of type: '${verifiedCredential.type}'`,
                LogContext.AUTH_POLICY
              );
              return true;
            }
            grantedPrivileges.push(privilege);
          }
        }
      }
    }

    const privilegeRules = this.convertPrivilegeRulesStr(
      authorization.privilegeRules
    );
    for (const rule of privilegeRules) {
      if (grantedPrivileges.includes(rule.sourcePrivilege)) {
        if (rule.grantedPrivileges.includes(privilegeRequired)) {
          this.logger.verbose?.(
            `[PrivilegeRule] Granted privilege '${privilegeRequired}' using privilege rule '${rule.name}'`,
            LogContext.AUTH_POLICY
          );
          return true;
        }
      }
    }
    return false;
  }

  getGrantedPrivileges(
    credentials: ICredential[],
    verifiedCredentials: IVerifiedCredential[],
    authorization: IAuthorizationPolicy
  ) {
    const grantedPrivileges: AuthorizationPrivilege[] = [];

    if (authorization.anonymousReadAccess) {
      grantedPrivileges.push(AuthorizationPrivilege.READ);
    }

    const credentialRules = this.convertCredentialRulesStr(
      authorization.credentialRules
    );
    for (const rule of credentialRules) {
      for (const credential of credentials) {
        if (this.isCredentialMatch(credential, rule)) {
          for (const privilege of rule.grantedPrivileges) {
            grantedPrivileges.push(privilege);
          }
        }
      }
    }

    const verifiedCredentialRules = this.convertVerifiedCredentialRulesStr(
      authorization.verifiedCredentialRules
    );
    for (const rule of verifiedCredentialRules) {
      for (const credential of verifiedCredentials) {
        if (this.isVerifiedCredentialMatch(credential, rule)) {
          for (const privilege of rule.grantedPrivileges) {
            grantedPrivileges.push(privilege);
          }
        }
      }
    }

    const privilegeRules = this.convertPrivilegeRulesStr(
      authorization.privilegeRules
    );
    for (const rule of privilegeRules) {
      if (grantedPrivileges.includes(rule.sourcePrivilege)) {
        grantedPrivileges.push(...rule.grantedPrivileges);
      }
    }

    const uniquePrivileges = grantedPrivileges.filter(
      (item, i, ar) => ar.indexOf(item) === i
    );

    return uniquePrivileges;
  }

  private isCredentialMatch(
    credential: ICredential,
    credentialRule: IAuthorizationPolicyRuleCredential
  ): boolean {
    const criterias = credentialRule.criterias;
    if (criterias.length === 0) {
      throw new AuthorizationInvalidPolicyException(
        `Credential rule without criteria: ${credentialRule}`,
        LogContext.AUTH
      );
    }
    for (const criteria of criterias) {
      if (credential.type === criteria.type) {
        if (
          criteria.resourceID === '' ||
          credential.resourceID === criteria.resourceID
        ) {
          return true;
        }
      }
    }
    return false;
  }

  private isVerifiedCredentialMatch(
    verifiedCredential: IVerifiedCredential,
    credentialRule: IAuthorizationPolicyRuleVerifiedCredential
  ): boolean {
    if (verifiedCredential.name === credentialRule.credentialName) {
      const claimRuleStr = credentialRule.claimRule;
      if (claimRuleStr.length === 0) return true;
      const claimRule: { name: string; value: string } =
        JSON.parse(claimRuleStr);
      for (const claim of verifiedCredential.claims) {
        if (claim.name === claimRule.name && claim.value === claimRule.value) {
          return true;
        }
      }
    }
    return false;
  }

  convertCredentialRulesStr(
    rulesStr: string
  ): IAuthorizationPolicyRuleCredential[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      const rules: IAuthorizationPolicyRuleCredential[] = JSON.parse(rulesStr);
      return rules;
    } catch (error) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }

  convertVerifiedCredentialRulesStr(
    rulesStr: string
  ): IAuthorizationPolicyRuleVerifiedCredential[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      const rules: IAuthorizationPolicyRuleVerifiedCredential[] =
        JSON.parse(rulesStr);
      return rules;
    } catch (error) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }

  convertPrivilegeRulesStr(
    rulesStr: string
  ): IAuthorizationPolicyRulePrivilege[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      const rules: AuthorizationPolicyRulePrivilege[] = JSON.parse(rulesStr);
      return rules;
    } catch (error) {
      const msg = `Unable to convert privilege rules to json: ${error}`;
      this.logger.error(msg);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }
}
