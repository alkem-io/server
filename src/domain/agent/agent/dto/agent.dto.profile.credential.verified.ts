import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ProfileCredentialVerified')
export class ProfileCredentialVerified {
  // give a unique identifier
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The vc.',
  })
  vc!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The email',
  })
  userEmail!: string;
}
