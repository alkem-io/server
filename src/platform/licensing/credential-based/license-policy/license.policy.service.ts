import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ILicensingCredentialBasedPolicyCredentialRule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.create';
import { UpdateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.update';
import { licensePolicies } from './license.policy.schema';
import { ILicensePolicy } from './license.policy.interface';

@Injectable()
export class LicensePolicyService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async createCredentialRule(
    createData: CreateLicensePolicyCredentialRuleInput
  ): Promise<ILicensingCredentialBasedPolicyCredentialRule> {
    const licensePolicy = await this.getDefaultLicensePolicyOrFail();

    const newRule: ILicensingCredentialBasedPolicyCredentialRule = {
      id: randomUUID(),
      grantedEntitlements: createData.grantedEntitlements,
      credentialType: createData.credentialType,
      name: createData.name,
    };

    licensePolicy.credentialRules.push(newRule);
    await this.save(licensePolicy);
    return newRule;
  }

  // TODO: a work around, need to look at how to make the license policy more readily available
  // in all contexts
  public async getDefaultLicensePolicyOrFail(): Promise<ILicensePolicy> {
    const licensePolicy = await this.db.query.licensePolicies.findFirst();

    if (!licensePolicy) {
      throw new EntityNotFoundException(
        'Unable to find default License Policy',
        LogContext.LICENSE
      );
    }
    return licensePolicy as unknown as ILicensePolicy;
  }

  public async getLicensePolicyOrFail(
    licensePolicyID: string
  ): Promise<ILicensePolicy> {
    const licensePolicy = await this.db.query.licensePolicies.findFirst({
      where: eq(licensePolicies.id, licensePolicyID),
    });
    if (!licensePolicy)
      throw new EntityNotFoundException(
        `Not able to locate License Policy with the specified ID: ${licensePolicyID}`,
        LogContext.LICENSE
      );
    return licensePolicy as unknown as ILicensePolicy;
  }

  // delete a specific credential rule
  async deleteLicensePolicyCredentialRule(
    credentialRuleID: string,
    licensePolicy: ILicensePolicy
  ): Promise<ILicensingCredentialBasedPolicyCredentialRule> {
    const ruleIndex = licensePolicy.credentialRules.findIndex(
      rule => rule.id === credentialRuleID
    );
    if (ruleIndex === -1) {
      throw new EntityNotFoundException(
        `Credential Rule with ID ${credentialRuleID} not found in License Policy ${licensePolicy.id}`,
        LogContext.LICENSE
      );
    }
    const [removedRule] = licensePolicy.credentialRules.splice(ruleIndex, 1);
    await this.save(licensePolicy);
    return removedRule;
  }

  // update a specific credential rule
  async updateCredentialRule(
    updateData: UpdateLicensePolicyCredentialRuleInput
  ): Promise<ILicensingCredentialBasedPolicyCredentialRule> {
    const licensePolicy = await this.getDefaultLicensePolicyOrFail();
    const ruleIndex = licensePolicy.credentialRules.findIndex(
      rule => rule.id === updateData.ID
    );
    if (ruleIndex === -1) {
      throw new EntityNotFoundException(
        `Credential Rule with ID ${updateData.ID} not found in License Policy ${licensePolicy.id}`,
        LogContext.LICENSE
      );
    }
    const ruleToUpdate = licensePolicy.credentialRules[ruleIndex];

    // Update fields if provided
    if (updateData.name !== undefined) {
      ruleToUpdate.name = updateData.name;
    }
    if (updateData.credentialType !== undefined) {
      ruleToUpdate.credentialType = updateData.credentialType;
    }
    if (updateData.grantedEntitlements !== undefined) {
      ruleToUpdate.grantedEntitlements = updateData.grantedEntitlements;
    }

    // Save the updated license policy
    await this.save(licensePolicy);
    return ruleToUpdate;
  }

  async delete(licensePolicy: ILicensePolicy): Promise<ILicensePolicy> {
    await this.db
      .delete(licensePolicies)
      .where(eq(licensePolicies.id, licensePolicy.id));
    return licensePolicy;
  }

  async save(licensePolicy: ILicensePolicy): Promise<ILicensePolicy> {
    const [saved] = await this.db
      .insert(licensePolicies)
      .values(licensePolicy as any)
      .onConflictDoUpdate({
        target: licensePolicies.id,
        set: licensePolicy as any,
      })
      .returning();
    return saved as unknown as ILicensePolicy;
  }
}
