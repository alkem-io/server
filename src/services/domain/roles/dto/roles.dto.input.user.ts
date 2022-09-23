import { HubVisibility } from '@common/enums/hub.visibility';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RolesUserInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description: 'The ID of the user to retrieve the roles of.',
  })
  userID!: string;

  @Field(() => [HubVisibility], {
    nullable: true,
    description:
      'Return roles in Hubs with a Visibility matching one of the provided types.',
  })
  visibilities?: HubVisibility[];
}
