import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CredentialDefinition')
export abstract class ICredentialDefinition {
  @Field(() => String, {
    description: 'The type for this CredentialDefinition',
  })
  type!: string;

  @Field(() => String, {
    description: 'The resourceID for this CredentialDefinition',
  })
  resourceID!: string;
}
