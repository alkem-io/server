import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CreateCalloutSettingsContributionInput } from '@domain/collaboration/callout-settings-contribution/dto';

@InputType()
@ObjectType('CreateCalloutSettingsData')
export class CreateCalloutSettingsInput {
  /*@Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => CreateWhiteboardInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateWhiteboardInput)
  whiteboard?: CreateWhiteboardInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
  */

  @Field(() => CreateCalloutSettingsContributionInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutSettingsContributionInput)
  contribution?: CreateCalloutSettingsContributionInput;

  @Field(() => CalloutVisibility, {
    nullable: true,
    description: 'Visibility of the Callout. Defaults to DRAFT.',
  })
  visibility?: CalloutVisibility;
}
