import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VerifiedCredential {
  @Field(() => String, {
    description: 'The stringified representation of the VC',
  })
  claimID: string;

  @Field(() => String, {
    description: 'The challenge issuing the VC',
  })
  issuedBy: string;

  @Field(() => String, {
    description: 'The user receiving VC',
  })
  issuedTo: string;

  constructor() {
    this.claimID = '';
    this.issuedBy = '';
    this.issuedTo = '';
  }
}
