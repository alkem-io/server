import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CredentialInfo')
export class CredentialInfoDto {
  @Field(() => String, {
    description: 'The type of the credential',
  })
  type!: string;

  @Field(() => String, {
    description: 'The resource ID associated with the credential',
  })
  resourceID!: string;

  @Field(() => String, {
    description: 'A human-readable description of the credential',
  })
  description!: string;
}
