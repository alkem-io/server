import { Field, InputType } from '@nestjs/graphql';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { IsOptional } from 'class-validator';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';

@InputType()
export class CreateCommunityGuidelinesTemplateInput extends CreateTemplateBaseInput {
  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the Community guidelines to associate with this template.',
  })
  @IsOptional()
  communityGuidelinesID?: string;

  @Field(() => CreateCommunityGuidelinesInput, {
    nullable: true,
    description: 'The Community guidelines to associate with this template.',
  })
  @IsOptional()
  communityGuidelines?: CreateCommunityGuidelinesInput;
}
