import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Type } from 'class-transformer';

@InputType()
export class CreateUserGroupInput {
  @Field(() => UUID, { nullable: false })
  parentID!: string;

  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profileData!: CreateProfileInput;
}
