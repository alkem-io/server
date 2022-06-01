import { IOrganization } from '@domain/community';
import { Field, ObjectType } from '@nestjs/graphql';
import { RolesResult as RolesResult } from './roles.dto.result';

@ObjectType()
export class RolesResultOrganization extends RolesResult {
  @Field(() => String, {
    description: 'The Organization ID.',
  })
  organizationID: string;

  constructor(organization: IOrganization, contributorID: string) {
    super(
      organization.nameID,
      `${contributorID}/${organization.id}`,
      organization.displayName
    );
    this.organizationID = organization.id;
  }
}
