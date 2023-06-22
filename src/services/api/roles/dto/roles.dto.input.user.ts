import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';

@InputType()
export class RolesUserInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description: 'The ID of the user to retrieve the roles of.',
  })
  userID!: string;

  @Field(() => SpaceFilterInput, {
    nullable: true,
    description: 'Return membership in Spaces matching the provided filter.',
  })
  filter?: SpaceFilterInput;
}
