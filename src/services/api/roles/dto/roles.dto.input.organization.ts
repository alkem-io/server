import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';

@InputType()
export class RolesOrganizationInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID of the organization to retrieve the roles of.',
  })
  organizationID!: string;

  @Field(() => SpaceFilterInput, {
    nullable: true,
    description: 'Return membership in Spaces matching the provided filter.',
  })
  filter?: SpaceFilterInput;
}
