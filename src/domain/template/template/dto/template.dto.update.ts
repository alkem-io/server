import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-states/dto/innovation.flow.state.dto.update';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
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
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  postDefaultDescription!: string;

  @Field(() => [UpdateInnovationFlowStateInput], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowStateInput)
  innovationFlowStates!: UpdateInnovationFlowStateInput[];

  @Field(() => UpdateCommunityGuidelinesInput, {
    nullable: true,
    description: 'The Community guidelines to associate with this template.',
  })
  @IsOptional()
  @Type(() => UpdateCommunityGuidelinesInput)
  communityGuidelines?: UpdateCommunityGuidelinesInput;
}
