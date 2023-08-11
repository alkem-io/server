import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { RolesResultOrganization } from './roles.dto.result.organization';
import { RolesResultSpace } from './roles.dto.result.space';

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
}
