import { Field, InputType } from '@nestjs/graphql';
import { CreateSpaceInput } from '@domain/space/space/dto/space.dto.create';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CreateSpaceOnAccountInput extends CreateSpaceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Account where the Space is to be created.',
  })
  accountID!: string;
}
