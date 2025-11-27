import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  EntityNotInitializedException,
  ForbiddenException,
} from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { LogContext } from '@common/enums';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';
import { IAuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential.interface';
import { IAuthorizationPolicyRuleVerifiedCredential } from './authorization.policy.rule.verified.credential.interface';
import { AuthorizationInvalidPolicyException } from '@common/exceptions/authorization.invalid.policy.exception';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AuthRemoteEvaluationService } from '@services/external/auth-remote-evaluation';
import { AuthEvaluationResponse } from '@services/external/auth-remote-evaluation/types';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { isCircuitOpenResponse } from '@services/util/circuit-breakers/types';

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private remoteAuthEvaluationService: AuthRemoteEvaluationService,
    @InjectEntityManager()
    private entityManager: EntityManager
  ) {}

  /**
   * @returns _true_ if access is granted, otherwise throws {@link ForbiddenAuthorizationPolicyException}
   * @throws ForbiddenAuthorizationPolicyException
   */
  grantAccessOrFail(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege,
    msg: string
  ) {
    const auth = this.validateAuthorization(
      authorization,
      msg,
      privilegeRequired
    );

    if (this.isAccessGranted(agentInfo, auth, privilegeRequired)) return true;

    const errorMsg = `Authorization: unable to grant '${privilegeRequired}' privilege: ${msg} user: ${agentInfo.userID} on authorization ${auth.id} of type '${auth.type}'`;
    this.logCredentialCheckFailDetails(errorMsg, agentInfo, auth);
    // If you get to here then no match was found
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
    )}'; authorization definition: rules: ${authorization?.credentialRules}`;
    this.logger.debug?.(msg, LogContext.AUTH_POLICY);
  }

  logAgentInfo(agentInfo: AgentInfo) {
    this.logger.debug?.(
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
    authorization: IAuthorizationPolicy | undefined,
    msg: string,
    privilegeRequired: AuthorizationPrivilege
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new ForbiddenException(
        'Authorization: no definition provided',
        LogContext.AUTH_POLICY
      );
    if (authorization.credentialRules.length === 0) {
      throw new AuthorizationInvalidPolicyException(
        `AuthorizationPolicy without credential rules provided: ${authorization.id}, type: ${authorization.type}, privilege: ${privilegeRequired}, message: ${msg}`,
        LogContext.AUTH
      );
    }
    return authorization;
  }

  isAccessGranted(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege
  ): boolean {
    return this.isAccessGrantedForCredentials(
      agentInfo.credentials,
      agentInfo.verifiedCredentials,
      authorization,
      privilegeRequired
    );
  }

  isAccessGrantedForCredentials(
    credentials: ICredentialDefinition[],
    verifiedCredentials: IVerifiedCredential[],
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege
  ): boolean {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization: no definition provided',
        LogContext.AUTH_POLICY
      );
    }

    // Keep track of all the granted privileges via Credential rules so can use with Privilege rules
    const grantedPrivileges: AuthorizationPrivilege[] = [];

    const credentialRules = authorization.credentialRules;
    for (const rule of credentialRules) {
      for (const credential of credentials) {
        if (this.isCredentialMatch(credential, rule)) {
          for (const privilege of rule.grantedPrivileges) {
            if (privilege === privilegeRequired) {
              this.logger.verbose?.(
                `[CredentialRule] Granted privilege '${privilegeRequired}' using rule '${rule.name}' on authorization ${authorization.id} on type: ${authorization.type}`,
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
      authorization.verifiedCredentialRules;
    for (const rule of verifiedCredentialRules) {
      for (const verifiedCredential of verifiedCredentials) {
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

    const privilegeRules = authorization.privilegeRules;
    for (const rule of privilegeRules) {
      if (grantedPrivileges.includes(rule.sourcePrivilege)) {
        if (rule.grantedPrivileges.includes(privilegeRequired)) {
          this.logger.verbose?.(
            `[PrivilegeRule] Granted privilege '${privilegeRequired}' using privilege rule '${rule.name}' on authorization ${authorization.id}`,
            LogContext.AUTH_POLICY
          );
          return true;
        }
      }
    }
    return false;
  }

  public async isAccessGrantedRemoteEvaluation(
    agentId: string,
    authorizationPolicyId: string,
    requiredPrivilege: AuthorizationPrivilege
  ): Promise<AuthEvaluationResponse> {
    const response = await this.remoteAuthEvaluationService.evaluate({
      agentId,
      authorizationPolicyId,
      privilege: requiredPrivilege,
    });

    if (isCircuitOpenResponse(response)) {
      const { reason, metadata, retryAfter } = response;
      this.logger.error(
        {
          message: 'Remote authorization evaluation service is unavailable',
          reason,
          retryAfter,
          metadata,
        },
        undefined,
        LogContext.AUTH_EVALUATION
      );
      return { allowed: false, reason };
    }

    return response;
  }

  public getGrantedPrivileges(
    credentials: ICredentialDefinition[],
    verifiedCredentials: IVerifiedCredential[],
    authorization: IAuthorizationPolicy
  ): AuthorizationPrivilege[] {
    const grantedPrivileges = new Set<AuthorizationPrivilege>();

    const credentialRules = authorization.credentialRules || [];

    credentialRules.forEach(rule => {
      credentials.forEach(credential => {
        if (this.isCredentialMatch(credential, rule)) {
          rule.grantedPrivileges.forEach(privilege =>
            grantedPrivileges.add(privilege)
          );
        }
      });
    });

    const verifiedCredentialRules = authorization.verifiedCredentialRules || [];

    verifiedCredentialRules.forEach(rule => {
      verifiedCredentials.forEach(credential => {
        if (this.isVerifiedCredentialMatch(credential, rule)) {
          rule.grantedPrivileges.forEach(privilege =>
            grantedPrivileges.add(privilege)
          );
        }
      });
    });

    const initialGrantedPrivileges = Array.from(grantedPrivileges);

    const privilegeRules = authorization.privilegeRules || [];
    for (const rule of privilegeRules) {
      if (initialGrantedPrivileges.includes(rule.sourcePrivilege)) {
        for (const privilege of rule.grantedPrivileges) {
          grantedPrivileges.add(privilege);
        }
      }
    }

    return Array.from(grantedPrivileges);
  }
  private isCredentialMatch(
    credential: ICredentialDefinition,
    credentialRule: IAuthorizationPolicyRuleCredential
  ): boolean {
    const criterias = credentialRule.criterias;
    if (criterias.length === 0) {
      throw new AuthorizationInvalidPolicyException(
        `Credential rule without criteria: ${JSON.stringify(credentialRule)}`,
        LogContext.AUTH
      );
    }
    return criterias.some(
      criteria =>
        credential.type === criteria.type &&
        (criteria.resourceID === '' ||
          credential.resourceID === criteria.resourceID)
    );
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
}
