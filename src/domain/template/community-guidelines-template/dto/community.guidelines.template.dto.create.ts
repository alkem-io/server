import { Field, InputType } from '@nestjs/graphql';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { IsOptional } from 'class-validator';

@InputType()
export class CreateCommunityGuidelinesTemplateInput extends CreateTemplateBaseInput {
  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the CommunityGuidelines to associate with this template.',
  })
  @IsOptional()
  communityGuidelinesID?: string;
}
