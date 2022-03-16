import { Field, ObjectType } from '@nestjs/graphql';
import { VerifiedCredentialClaim } from './dto/verified.credential.dto.claim.result';
import JSON from 'graphql-type-json';

@ObjectType('VerifiedCredential')
export abstract class IVerifiedCredential {
  @Field(() => String, {
    description: 'The type of VC',
  })
  type!: string;

  @Field(() => String, {
    description: 'The challenge issuing the VC',
  })
  issuer!: string;

  @Field(() => String, {
    description: 'The time at which the credential was issued',
  })
  issued?: string;

  @Field(() => String, {
    description: 'The time at which the credential is no longer valid',
  })
  expires?: string;

  // Raw string with claims
  claim!: string;

  @Field(() => [VerifiedCredentialClaim], {
    description: 'The time at which the credential is no longer valid',
  })
  claims!: VerifiedCredentialClaim[];

  @Field(() => JSON, {
    description: 'JSON for the context in the credential',
  })
  context!: string;

  @Field(() => String, {
    description: 'The name of the VC',
  })
  name!: string;
}
