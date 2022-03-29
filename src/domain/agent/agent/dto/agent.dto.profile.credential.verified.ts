import { UUID } from '@domain/common/scalars/scalar.uuid';
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

  @Field(() => UUID, {
    nullable: false,
    description: 'The userID',
  })
  userID!: string;
}
