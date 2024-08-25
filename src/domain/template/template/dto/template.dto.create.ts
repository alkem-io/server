import {
  SMALL_TEXT_LENGTH,
  VERY_LONG_TEXT_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { TemplateType } from '@common/enums/template.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { UpdateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-states/dto/innovation.flow.state.dto.update';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class CreateTemplateInput {
  @Field(() => CreateProfileInput, {
    nullable: false,
    description: 'The profile of the template.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  visualUri?: string;

  @Field({
    nullable: false,
    description: 'The type of the Template to be created.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: TemplateType;

  @Field(() => Markdown, {
    nullable: true,
    description: 'Post Template: The default description to be pre-filled.',
  })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  postDefaultDescription?: string;

  @Field(() => [UpdateInnovationFlowStateInput], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowStateInput)
  innovationFlowStates!: UpdateInnovationFlowStateInput[];

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

  @Field(() => CreateCalloutInput, {
    nullable: true,
    description: 'The Callout to associate with this template.',
  })
  @IsOptional()
  callout?: CreateCalloutInput;

  @Field(() => CreateWhiteboardInput, {
    nullable: true,
    description: 'The Whiteboard to associate with this template.',
  })
  @IsOptional()
  whiteboard?: CreateWhiteboardInput;
}
