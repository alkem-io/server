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

  @Field(() => String, {
    description: 'The time at which the credential was issued',
  })
  issued?: string;

  @Field(() => JSON, {
    description: 'JSON for the claim in the credential',
  })
  claim: string;

  @Field(() => JSON, {
    description: 'JSON for the context in the credential',
  })
  context: string;

  @Field(() => String, {
    description: 'The name of the VC',
  })
  name: string;

  constructor() {
    this.type = '';
    this.issuer = '';
    this.claim = '';
    this.context = '';
    this.name = '';
  }
}
