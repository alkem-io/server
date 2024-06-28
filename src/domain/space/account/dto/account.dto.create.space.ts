import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSpaceInput } from '@domain/space/space/dto/space.dto.create';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CreateSpaceOnAccountInput {
  @Field(() => CreateSpaceInput, {
    nullable: false,
    description: 'The root Space to be created.',
  })
  @ValidateNested()
  @Type(() => CreateSpaceInput)
  spaceData!: CreateSpaceInput;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Account where the Space is to be created.',
  })
  accountID!: string;
}
