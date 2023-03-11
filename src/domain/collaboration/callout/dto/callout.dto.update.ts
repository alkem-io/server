import { CalloutState } from '@common/enums/callout.state';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateCalloutCanvasTemplateInput } from './callout.dto.update.canvasTemplate';
import { UpdateCalloutCardTemplateInput } from './callout.dto.update.cardTemplate';

@InputType()
export class UpdateCalloutInput extends UpdateNameableInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'Update the Profile of the Canvas.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state?: CalloutState;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => UpdateCalloutCardTemplateInput, {
    nullable: true,
    description: 'CardTemplate data for this Callout.',
  })
  cardTemplate?: UpdateCalloutCardTemplateInput;

  @Field(() => UpdateCalloutCanvasTemplateInput, {
    nullable: true,
    description: 'CanvasTemplate data for this Callout.',
  })
  canvasTemplate?: UpdateCalloutCanvasTemplateInput;
}
