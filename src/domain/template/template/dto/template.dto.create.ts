import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { CreateTemplateBaseInput } from './template.dto.create.base';

@InputType()
export class CreateTemplateInput extends CreateTemplateBaseInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'Post Template: The default description to be pre-filled.',
  })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  postDefaultDescription?: string;

  @Field(() => CreateCommunityGuidelinesInput, {
    nullable: true,
    description: 'The Community guidelines to associate with this template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCommunityGuidelinesInput)
  communityGuidelinesData?: CreateCommunityGuidelinesInput;

  @Field(() => CreateCalloutInput, {
    nullable: true,
    description: 'The Callout to associate with this template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCalloutInput)
  calloutData?: CreateCalloutInput;

  @Field(() => CreateWhiteboardInput, {
    nullable: true,
    description: 'The Whiteboard to associate with this template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWhiteboardInput)
  whiteboard?: CreateWhiteboardInput;

  @Field(() => CreateCollaborationInput, {
    nullable: true,
    description: 'The Collaboration to associate with this template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCollaborationInput)
  collaborationData?: CreateCollaborationInput;
}
