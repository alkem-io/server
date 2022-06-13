import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationForRoleResult } from './roles.dto.result.application';
import { RolesResultOrganization } from './roles.dto.result.organization';
import { RolesResultHub } from './roles.dto.result.hub';

@ObjectType()
export class ContributorRoles {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => [RolesResultHub], {
    description:
      'Details of Hubs the User or Organization is a member of, with child memberships',
  })
  hubs: RolesResultHub[] = [];

  @Field(() => [RolesResultOrganization], {
    description:
      'Details of the Organizations the User is a member of, with child memberships.',
  })
  organizations: RolesResultOrganization[] = [];

  @Field(() => [ApplicationForRoleResult], {
    nullable: true,
    description: 'Open applications for this contributor.',
  })
  applications: ApplicationForRoleResult[] = [];
}
