import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ILicensePolicy } from '@platform/licensing/credential-based/license-policy/license.policy.interface';
import { ForbiddenLicensePolicyException } from '@common/exceptions/forbidden.license.policy.exception';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { LicensePolicy } from '@platform/licensing/credential-based/license-policy';
import { IAgent, ICredential } from '@domain/agent';
import { ILicensingCredentialBasedPolicyCredentialRule } from './licensing.credential.based.policy.credential.rule.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';

@Injectable()
export class LicensingCredentialBasedService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async grantEntitlementOrFail(
    entitlementRequired: LicenseEntitlementType,
    agent: IAgent,
    msg: string,
    licensePolicy: ILicensePolicy | undefined
  ) {
    const accessGranted = await this.isEntitlementGranted(
      entitlementRequired,
      agent,
      licensePolicy
    );
    if (accessGranted) return true;

    const errorMsg = `License.engine: unable to grant '${entitlementRequired}' privilege: ${msg} license: ${agent.id}`;
    // If you get to here then no match was found
    throw new ForbiddenLicensePolicyException(
      errorMsg,
      entitlementRequired,
      licensePolicy?.id || 'no license policy',
      agent.id
    );
  }

  public async isEntitlementGranted(
    entitlementRequired: LicenseEntitlementType,
    agent: IAgent,
    licensePolicy?: ILicensePolicy | undefined
  ): Promise<boolean> {
    const policy =
      await this.getLicensingCredentialBasedPolicyOrFail(licensePolicy);
    const credentials = await this.getCredentialsFromAgent(agent);

    const credentialRules = this.convertCredentialRulesStr(
      policy.credentialRulesStr
    );
    for (const credentialRule of credentialRules) {
      for (const credential of credentials) {
        if (credential.type === credentialRule.credentialType) {
          const grantedEntitlement = credentialRule.grantedEntitlements.find(
            ge => ge.type === entitlementRequired
          );
          if (grantedEntitlement) {
            this.logger.verbose?.(
              `[CredentialRule] Granted privilege '${entitlementRequired}' using rule '${credentialRule.name}'`,
              LogContext.LICENSE
            );
            return true;
          }
        }
      }
    }
    return false;
  }

  public async getEntitlementIfGranted(
    entitlementRequired: LicenseEntitlementType,
    agent: IAgent,
    licensePolicy?: ILicensePolicy | undefined
  ): Promise<LicensingGrantedEntitlement | undefined> {
    const policy =
      await this.getLicensingCredentialBasedPolicyOrFail(licensePolicy);
    const credentials = await this.getCredentialsFromAgent(agent);

    const credentialRules = this.convertCredentialRulesStr(
      policy.credentialRulesStr
    );
    for (const credentialRule of credentialRules) {
      for (const credential of credentials) {
        if (credential.type === credentialRule.credentialType) {
          const grantedEntitlement = credentialRule.grantedEntitlements.find(
            ge => ge.type === entitlementRequired
          );
          if (grantedEntitlement) {
            this.logger.verbose?.(
              `[CredentialRule] Granted privilege '${entitlementRequired}' using rule '${credentialRule.name}'`,
              LogContext.LICENSE
            );
            return grantedEntitlement;
          }
        }
      }
    }
    return undefined;
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

  private async getLicensingCredentialBasedPolicyOrFail(
    licensePolicy?: ILicensePolicy | undefined
  ): Promise<ILicensePolicy> {
    let policy = licensePolicy;
    if (!policy) {
      policy = await this.getDefaultLicensePollicyOrFail();
    }
    return policy;
  }

  public async getGrantedEntitlements(
    agent: IAgent,
    licensePolicy?: ILicensePolicy
  ): Promise<LicenseEntitlementType[]> {
    const policy =
      await this.getLicensingCredentialBasedPolicyOrFail(licensePolicy);
    const credentials = await this.getCredentialsFromAgent(agent);

    const grantedEntitlements: LicenseEntitlementType[] = [];

    const credentialRules = this.convertCredentialRulesStr(
      policy.credentialRulesStr
    );
    for (const rule of credentialRules) {
      for (const credential of credentials) {
        if (rule.credentialType === credential.type) {
          for (const entitlement of rule.grantedEntitlements) {
            if (entitlement.limit > 0) {
              grantedEntitlements.push(entitlement.type);
            }
          }
        }
      }
    }

    const uniquePrivileges = grantedEntitlements.filter(
      (item, i, ar) => ar.indexOf(item) === i
    );

    return uniquePrivileges;
  }

  convertCredentialRulesStr(
    rulesStr: string
  ): ILicensingCredentialBasedPolicyCredentialRule[] {
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
