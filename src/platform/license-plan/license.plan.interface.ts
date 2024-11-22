import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credental.based.credential.type';
import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credental.based.plan.type';
import { ILicensingFramework } from '@platform/licensing-framework/licensing.framework.interface';

@ObjectType('LicensePlan')
export abstract class ILicensePlan extends IBaseAlkemio {
  licensingFramework?: ILicensingFramework;

  @Field(() => String, {
    description: 'The name of the License Plan',
    nullable: false,
  })
  name!: string;

  @Field(() => Boolean, {
    description: 'Is this plan enabled?',
    nullable: false,
  })
  enabled!: boolean;

  @Field(() => Number, {
    nullable: false,
    description: 'The sorting order for this Plan.',
  })
  sortOrder!: number;

  @Field(() => LicensingCredentialBasedPlanType, {
    nullable: false,
    description: 'The type of this License Plan.',
  })
  type!: LicensingCredentialBasedPlanType;

  @Field(() => Number, {
    nullable: true,
    description: 'The price per month of this plan.',
  })
  pricePerMonth!: number;

  @Field(() => Boolean, {
    description: 'Is this plan free?',
    nullable: false,
  })
  isFree!: boolean;

  @Field(() => Boolean, {
    description: 'Is there a trial period enabled',
    nullable: false,
  })
  trialEnabled!: boolean;

  @Field(() => Boolean, {
    description: 'Does this plan require a payment method?',
    nullable: false,
  })
  requiresPaymentMethod!: boolean;

  @Field(() => Boolean, {
    description: 'Does this plan require contact support',
    nullable: false,
  })
  requiresContactSupport!: boolean;

  @Field(() => LicensingCredentialBasedCredentialType, {
    description: 'The credential to represent this plan',
    nullable: false,
  })
  licenseCredential!: LicensingCredentialBasedCredentialType;

  @Field(() => Boolean, {
    description: 'Assign this plan to all new User accounts',
    nullable: false,
  })
  assignToNewUserAccounts!: boolean;

  @Field(() => Boolean, {
    description: 'Assign this plan to all new Organization accounts',
    nullable: false,
  })
  assignToNewOrganizationAccounts!: boolean;
}
