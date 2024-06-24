import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { LicenseCredential } from '@common/enums/license.credential';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateLicensePlanInput {
  @Field(() => String, {
    description: 'The name of the License Plan',
    nullable: false,
  })
  @MaxLength(SMALL_TEXT_LENGTH)
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
