import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { LicenseCredential } from '@common/enums/license.credential';
import { LicensePlanType } from '@common/enums/license.plan.type';

@ObjectType('LicensePlan')
export abstract class ILicensePlan extends IBaseAlkemio {
  licensing?: ILicensing;

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

  @Field(() => LicensePlanType, {
    nullable: false,
    description: 'The type of this License Plan.',
  })
  type!: LicensePlanType;

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

  @Field(() => LicenseCredential, {
    description: 'The credential to represent this plan',
    nullable: false,
  })
  licenseCredential!: LicenseCredential;

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
