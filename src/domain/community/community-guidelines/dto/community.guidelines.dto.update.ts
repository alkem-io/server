import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/common/profile/dto';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdateCommunityGuidelinesInput {
  @Field(() => UpdateProfileInput, {
    nullable: false,
    description: 'The Profile for this community guidelines.',
  })
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile!: UpdateProfileInput;
}
