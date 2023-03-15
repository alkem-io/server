import { IOrganization } from '@domain/community';
import { Field, ObjectType } from '@nestjs/graphql';
import { RolesResult as RolesResult } from './roles.dto.result';

@ObjectType()
export class RolesResultOrganization extends RolesResult {
  @Field(() => String, {
    description: 'The Organization ID.',
  })
  organizationID: string;

  @Field(() => [RolesResult], {
    description:
      'Details of the Groups in the Organizations the user is a member of',
  })
  userGroups: RolesResult[];

  constructor(organization: IOrganization) {
    super(organization.nameID, organization.id, organization.displayName);
    this.organizationID = organization.id;
    this.userGroups = [];
  }
}
