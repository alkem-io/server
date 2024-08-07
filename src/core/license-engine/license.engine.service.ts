import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { ILicensePolicy } from '@platform/license-policy/license.policy.interface';
import { ForbiddenLicensePolicyException } from '@common/exceptions/forbidden.license.policy.exception';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { LicensePolicy } from '@platform/license-policy';
import { IAgent, ICredential } from '@domain/agent';
import { ILicensePolicyCredentialRule } from './license.policy.rule.credential.interface';

@Injectable()
export class LicenseEngineService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async grantAccessOrFail(
    privilegeRequired: LicensePrivilege,
    agent: IAgent,
    msg: string,
    licensePolicy: ILicensePolicy | undefined
  ) {
    const accessGranted = await this.isAccessGranted(
      privilegeRequired,
      agent,
      licensePolicy
    );
    if (accessGranted) return true;

    const errorMsg = `License.engine: unable to grant '${privilegeRequired}' privilege: ${msg} license: ${agent.id}`;
    // If you get to here then no match was found
    throw new ForbiddenLicensePolicyException(
      errorMsg,
      privilegeRequired,
      licensePolicy?.id || 'no license policy',
      agent.id
    );
  }

  public async isAccessGranted(
    privilegeRequired: LicensePrivilege,
    agent: IAgent,
    licensePolicy?: ILicensePolicy | undefined
  ): Promise<boolean> {
    const policy = await this.getLicensePolicyOrFail(licensePolicy);
    const credentials = await this.getCredentialsFromAgent(agent);

    const credentialRules = this.convertCredentialRulesStr(
      policy.credentialRulesStr
    );
    for (const credentialRule of credentialRules) {
      for (const credential of credentials) {
        if (credential.type === credentialRule.credentialType) {
          if (credentialRule.grantedPrivileges.includes(privilegeRequired)) {
            this.logger.verbose?.(
              `[CredentialRule] Granted privilege '${privilegeRequired}' using rule '${credentialRule.name}'`,
              LogContext.LICENSE
            );
            return true;
          }
        }
      }
    }
    return false;
  }

  private async getCredentialsFromAgent(agent: IAgent): Promise<ICredential[]> {
    const credentials = agent.credentials;
    if (!credentials) {
      throw new EntityNotFoundException(
        `Unable to find credentials on agent ${agent.id}`,
        LogContext.LICENSE
      );
    }
    return credentials;
  }

  private async getLicensePolicyOrFail(
    licensePolicy?: ILicensePolicy | undefined
  ): Promise<ILicensePolicy> {
    let policy = licensePolicy;
    if (!policy) {
      policy = await this.getDefaultLicensePollicyOrFail();
    }
    return policy;
  }

  public async getGrantedPrivileges(
    agent: IAgent,
    licensePolicy?: ILicensePolicy
  ) {
    const policy = await this.getLicensePolicyOrFail(licensePolicy);
    const credentials = await this.getCredentialsFromAgent(agent);

    const grantedPrivileges: LicensePrivilege[] = [];

    const credentialRules = this.convertCredentialRulesStr(
      policy.credentialRulesStr
    );
    for (const rule of credentialRules) {
      for (const credential of credentials) {
        if (rule.credentialType === credential.type) {
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

  convertCredentialRulesStr(rulesStr: string): ILicensePolicyCredentialRule[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      return JSON.parse(rulesStr);
    } catch (error: any) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg, error?.stack, LogContext.AUTH);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }

  // TODO: a work around, need to look at how to make the license policy more readily available
  // in all contexts
  private async getDefaultLicensePollicyOrFail(): Promise<ILicensePolicy> {
    let licensePolicy: ILicensePolicy | null = null;
    licensePolicy = (
      await this.entityManager.find(LicensePolicy, { take: 1 })
    )?.[0];

    if (!licensePolicy) {
      throw new EntityNotFoundException(
        'Unable to find default License Policy',
        LogContext.LICENSE
      );
    }
    return licensePolicy;
  }
}
