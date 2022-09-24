import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { HubsFilterInput } from '@services/domain/hub-filter/dto/hub.filter.dto.input';

@InputType()
export class RolesOrganizationInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID of the organization to retrieve the roles of.',
  })
  organizationID!: string;

  @Field(() => HubsFilterInput, {
    nullable: true,
    description: 'Return membership in Hubs matching the provided filter.',
  })
  filter!: HubsFilterInput;
}
