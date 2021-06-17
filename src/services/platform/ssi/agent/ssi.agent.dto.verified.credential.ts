import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';

@ObjectType()
export class VerifiedCredential {
  @Field(() => String, {
    description: 'The type of VC',
  })
  type: string;

  @Field(() => String, {
    description: 'The challenge issuing the VC',
  })
  issuer: string;

  @Field(() => Date, {
    description: 'The time at which the credential was issued',
  })
  issued?: Date;

  @Field(() => JSON, {
    description: 'JSON for the claim in the credential',
  })
  claim: string;

  constructor() {
    this.type = '';
    this.issuer = '';
    this.claim = '';
  }
}
