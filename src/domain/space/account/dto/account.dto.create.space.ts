import { UUID } from '@domain/common/scalars';
import { CreateSpaceInput } from '@domain/space/space/dto/space.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateSpaceOnAccountInput extends CreateSpaceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Account where the Space is to be created.',
  })
  accountID!: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The license plan the user wishes to use when creating the space.',
  })
  licensePlanID?: string;
}
