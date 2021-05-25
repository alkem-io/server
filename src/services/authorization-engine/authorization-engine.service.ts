import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CredentialsSearchInput, ICredential } from '@domain/agent';
import { AuthorizationRule } from './authorizationRule';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenException } from '@common/exceptions';
import { LogContext } from '@common/enums';

export class AuthorizationEngineService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async grantAccessOrFail(
    credentials: ICredential[],
    rulesStr: string,
    privilegeRequested: AuthorizationPrivilege,
    msg: string
  ) {
    const rules = this.convertRulesStr(rulesStr);
    for (const rule of rules) {
      for (const credential of credentials) {
        if (
          credential.type === rule.type &&
          credential.resourceID === rule.resourceID
        ) {
          for (const privilege of rule.grantedPrivileges) {
            if (privilege === privilegeRequested) return true;
          }
        }
      }
    }

    // If get to here then no match was found
    throw new ForbiddenException(
      `Authorization: unable to grant ${privilegeRequested} access: ${msg}`,
      LogContext.AUTH
    );
  }

  async appendAuthorizationRule(
    rulesStr: string,
    credentialCriteria: CredentialsSearchInput,
    privileges: AuthorizationPrivilege[]
  ) {
    const rules = this.convertRulesStr(rulesStr);
    const newRule: AuthorizationRule = {
      type: credentialCriteria.type,
      resourceID: credentialCriteria.type,
      grantedPrivileges: privileges,
    };
    rules.push(newRule);
    return JSON.stringify(rules);
  }

  convertRulesStr(rulesStr: string): AuthorizationRule[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      const rules: AuthorizationRule[] = JSON.parse(rulesStr);
      return rules;
    } catch (error) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }
}
