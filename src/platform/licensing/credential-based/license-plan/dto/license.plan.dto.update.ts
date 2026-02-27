import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateLicensePlanInput extends UpdateBaseAlkemioInput {
  @Field(() => Boolean, {
    description: 'Is this plan enabled?',
    nullable: true,
  })
  enabled!: boolean;

  @Field(() => Number, {
    nullable: true,
    description: 'The sorting order for this Plan.',
  })
  sortOrder?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'The price per month of this plan.',
  })
  pricePerMonth?: number;

  @Field(() => Boolean, {
    description: 'Is this plan free?',
    nullable: true,
  })
  isFree?: boolean;

  @Field(() => Boolean, {
    description: 'Is there a trial period enabled',
    nullable: true,
  })
  trialEnabled?: boolean;

  @Field(() => Boolean, {
    description: 'Does this plan require a payment method?',
    nullable: true,
  })
  requiresPaymentMethod?: boolean;

  @Field(() => Boolean, {
    description: 'Does this plan require contact support',
    nullable: true,
  })
  requiresContactSupport?: boolean;

  @Field(() => LicensingCredentialBasedCredentialType, {
    description: 'The credential to represent this plan',
    nullable: true,
  })
  licenseCredential?: LicensingCredentialBasedCredentialType;

  @Field(() => Boolean, {
    description: 'Assign this plan to all new User accounts',
    nullable: true,
  })
  assignToNewUserAccounts?: boolean;

  @Field(() => Boolean, {
    description: 'Assign this plan to all new Organization accounts',
    nullable: true,
  })
  assignToNewOrganizationAccounts?: boolean;
}
