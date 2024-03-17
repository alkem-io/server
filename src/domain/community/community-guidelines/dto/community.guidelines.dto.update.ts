import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/common/profile/dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateCommunityGuidelinesInput {
  @Field(() => UUID, {
    description: 'ID of the CommunityGuidelines',
  })
  @IsOptional()
  communityGuidelinesID!: string;

  @Field(() => UpdateProfileInput, {
    nullable: false,
    description: 'The Profile for this community guidelines.',
  })
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile!: UpdateProfileInput;
}
