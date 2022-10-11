import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { HubFilterInput } from '@services/infrastructure/hub-filter/dto/hub.filter.dto.input';

@InputType()
export class RolesUserInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description: 'The ID of the user to retrieve the roles of.',
  })
  userID!: string;

  @Field(() => HubFilterInput, {
    nullable: true,
    description: 'Return membership in Hubs matching the provided filter.',
  })
  filter?: HubFilterInput;
}
