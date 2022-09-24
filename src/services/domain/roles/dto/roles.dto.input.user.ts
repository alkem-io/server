import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { HubsFilterInput } from '@services/domain/hub-filter/dto/hub.filter.dto.input';

@InputType()
export class RolesUserInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description: 'The ID of the user to retrieve the roles of.',
  })
  userID!: string;

  @Field(() => HubsFilterInput, {
    nullable: true,
    description: 'Return membership in Hubs matching the provided filter.',
  })
  filter!: HubsFilterInput;
}
