import { IApplication } from '@domain/access/application';
import { UUID } from '@domain/common/scalars';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OrganizationApplicationResult')
export class OrganizationApplicationResult {
  @Field(() => UUID, {
    description: 'ID for the pending organization application',
  })
  id!: string;

  @Field(() => IApplication, {
    description: 'The application itself',
  })
  application!: IApplication;

  @Field(() => IOrganization, {
    description: 'The organization the application is for',
  })
  organization!: IOrganization;
}
