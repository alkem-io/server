import { Field, InputType } from '@nestjs/graphql';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { Type } from 'class-transformer';

@InputType()
export class UpdateCommunityGuidelinesOfTemplateInput {
  @Field(() => UpdateProfileInput, {
    nullable: false,
    description: 'The Profile for this community guidelines.',
  })
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile!: UpdateProfileInput;
}

@InputType()
export class UpdateCommunityGuidelinesTemplateInput extends UpdateTemplateBaseInput {
  @Field(() => UpdateCommunityGuidelinesOfTemplateInput, {
    nullable: true,
    description: 'The Community guidelines to associate with this template.',
  })
  @IsOptional()
  communityGuidelines?: UpdateCommunityGuidelinesOfTemplateInput;
}
