import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { Type } from 'class-transformer';

@InputType()
@ObjectType('CreateMemoData')
export class CreateMemoInput {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile?: CreateProfileInput;

  nameID?: string;
}
