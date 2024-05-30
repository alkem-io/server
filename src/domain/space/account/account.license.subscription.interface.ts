import { LicenseCredential } from '@common/enums/license.credential';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AccountSubscription')
export abstract class IAccountSubscription {
  @Field(() => LicenseCredential, {
    description: 'The name of the Subscription.',
  })
  name!: LicenseCredential;

  @Field(() => Date, {
    nullable: true,
    description:
      'The expiry date of this subscription, null if it does never expire.',
  })
  expires?: Date;
}
