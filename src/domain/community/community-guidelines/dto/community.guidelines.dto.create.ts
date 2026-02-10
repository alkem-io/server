import { CreateProfileInput } from '@domain/common/profile/dto';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateCommunityGuidelinesData')
export class CreateCommunityGuidelinesInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;
}
