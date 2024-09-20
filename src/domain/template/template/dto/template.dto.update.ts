import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.update';
import { UpdateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.update';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { UpdateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.update';
import { UpdateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateTemplateInput extends UpdateBaseAlkemioInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of the Template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile?: UpdateProfileInput;

  @Field(() => Markdown, {
    nullable: true,
    description:
      'The default description to be pre-filled when users create Posts based on this template.',
  })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  postDefaultDescription!: string;

  @Field(() => UpdateInnovationFlowInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowInput)
  innovationFlow!: UpdateInnovationFlowInput;

  @Field(() => UpdateCommunityGuidelinesInput, {
    nullable: true,
    description: 'The Community guidelines to associate with this template.',
  })
  @IsOptional()
  @Type(() => UpdateCommunityGuidelinesInput)
  communityGuidelines?: UpdateCommunityGuidelinesInput;

  @Field(() => UpdateCalloutInput, {
    nullable: true,
    description: 'The Callout for this template.',
  })
  @IsOptional()
  @Type(() => UpdateCalloutInput)
  callout?: UpdateCalloutInput;

  @Field(() => UpdateWhiteboardInput, {
    nullable: true,
    description: 'The Whiteboard for this template.',
  })
  @IsOptional()
  @Type(() => UpdateWhiteboardInput)
  whiteboard?: UpdateWhiteboardInput;
}
