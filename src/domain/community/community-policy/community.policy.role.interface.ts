import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunityRolePolicy')
export abstract class ICommunityRolePolicy {
  @Field(() => ICredentialDefinition, {
    description: 'The CredentialDefinition that is associated with this role',
  })
  credential!: ICredentialDefinition;

  @Field(() => [ICredentialDefinition], {
    description:
      'The CredentialDefinitions associated with this role in parent communities',
  })
  parentCredentials!: ICredentialDefinition[];

  @Field(() => Number, {
    description: 'Minimum number of Users in this role',
  })
  minUser!: number;

  @Field(() => Number, {
    description: 'Maximum number of Users in this role',
  })
  maxUser!: number;

  @Field(() => Number, {
    description: 'Minimun number of Organizations in this role',
  })
  minOrg!: number;

  @Field(() => Number, {
    description: 'Maximum number of Organizations in this role',
  })
  maxOrg!: number;
}
