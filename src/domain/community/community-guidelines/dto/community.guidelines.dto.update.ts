import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/common/profile/dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdateCommunityGuidelinesInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile for this community guidelines.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile?: UpdateProfileInput;
}
