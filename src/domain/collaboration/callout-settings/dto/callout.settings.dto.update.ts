import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { UpdateCalloutSettingsContributionInput } from '@domain/collaboration/callout-settings-contribution/dto';

@InputType()
export class UpdateCalloutSettingsInput {
  /*
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of the Template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile?: UpdateProfileInput;

  @Field(() => WhiteboardContent, {
    nullable: true,
    description: 'The new content to be used.',
  })
  @IsOptional()
  whiteboardContent?: string;
*/
  @Field(() => UpdateCalloutSettingsContributionInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutSettingsContributionInput)
  contributionPolicy?: UpdateCalloutSettingsContributionInput;

  @Field(() => CalloutVisibility, {
    description: 'Visibility of the Callout.',
  })
  visibility!: CalloutVisibility;
}
