import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
@ObjectType('CreateCommunityGuidelinesData')
export class CreateCommunityGuidelinesInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;
}
