import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationForRoleResult } from './roles.dto.result.application';
import { RolesResultOrganization } from './roles.dto.result.organization';
import { RolesResultSpace } from './roles.dto.result.space';
import { InvitationForRoleResult } from './roles.dto.result.invitation';

@ObjectType()
export class ContributorRoles {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => [RolesResultSpace], {
    description:
      'Details of Spaces the User or Organization is a member of, with child memberships',
  })
  spaces: RolesResultSpace[] = [];

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

  @Field(() => [InvitationForRoleResult], {
    nullable: true,
    description: 'Open invitations for this contributor.',
  })
  invitations: InvitationForRoleResult[] = [];
}
