import { UpdateProfileInput } from '@domain/common/profile/dto';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

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
