import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceSubscription')
export abstract class ISpaceSubscription {
  @Field(() => LicensingCredentialBasedCredentialType, {
    description: 'The name of the Subscription.',
  })
  name!: LicensingCredentialBasedCredentialType;

  @Field(() => Date, {
    nullable: true,
    description:
      'The expiry date of this subscription, null if it does never expire.',
  })
  expires?: Date;
}
