import { HubVisibility } from '@common/enums/hub.visibility';
import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RolesOrganizationInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID of the organization to retrieve the roles of.',
  })
  organizationID!: string;

  @Field(() => [HubVisibility], {
    nullable: true,
    description:
      'Return roles in Hubs with a Visibility matching one of the provided types.',
  })
  visibilities?: HubVisibility[];
}
