import { Field, InputType } from '@nestjs/graphql';
import {
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Type } from 'class-transformer';

@InputType()
export class CreateUserGroupInput {
  @Field(() => UUID, { nullable: false })
  parentID!: string;

  @Field({
    nullable: false,
    description: 'The name of the UserGroup. Minimum length 2.',
  })
  @MinLength(2)
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => CreateProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profileData?: CreateProfileInput;
}
