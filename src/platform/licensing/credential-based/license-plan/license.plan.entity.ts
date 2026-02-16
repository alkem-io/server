import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { LicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.entity';
import { ILicensePlan } from './license.plan.interface';

export class LicensePlan extends BaseAlkemioEntity implements ILicensePlan {
  licensingFramework?: LicensingFramework;

  name!: string;

  enabled!: boolean;

  sortOrder!: number;

  pricePerMonth!: number;

  isFree!: boolean;

  trialEnabled!: boolean;

  requiresPaymentMethod!: boolean;

  requiresContactSupport!: boolean;

  licenseCredential!: LicensingCredentialBasedCredentialType;

  type!: LicensingCredentialBasedPlanType;

  assignToNewOrganizationAccounts!: boolean;

  assignToNewUserAccounts!: boolean;
}
