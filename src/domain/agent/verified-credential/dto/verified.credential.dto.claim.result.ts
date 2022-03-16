import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';

@ObjectType()
export class VerifiedCredentialClaim {
  @Field(() => JSON, {
    description: 'The name of the claim',
  })
  name: string;

  @Field(() => JSON, {
    description: 'The value for the claim',
  })
  value: string;

  constructor(name: string, value: string) {
    this.value = value;
    this.name = name;
  }
}
