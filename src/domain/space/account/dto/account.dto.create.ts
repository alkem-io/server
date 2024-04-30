import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSpaceInput } from '@domain/space/space/dto/space.dto.create';

@InputType()
export class CreateAccountInput {
  @Field(() => CreateSpaceInput, {
    nullable: false,
    description: 'The root Space to be created.',
  })
  @ValidateNested()
  @Type(() => CreateSpaceInput)
  spaceData!: CreateSpaceInput;

  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The host Organization for the account',
  })
  hostID!: string;
}
