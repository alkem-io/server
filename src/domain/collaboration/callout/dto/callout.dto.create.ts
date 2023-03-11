import { Field, InputType } from '@nestjs/graphql';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CreateAspectTemplateInput } from '@domain/template/aspect-template/dto/aspect.template.dto.create';
import { CreateCanvasTemplateInput } from '@domain/template/canvas-template/dto/canvas.template.dto.create';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateCalloutInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profileData!: CreateProfileInput;

  @Field(() => CalloutType, {
    description: 'Callout type.',
  })
  type!: CalloutType;

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => CreateAspectTemplateInput, {
    nullable: true,
    description: 'CardTemplate data for Card Callouts.',
  })
  cardTemplate?: CreateAspectTemplateInput;

  @Field(() => CreateCanvasTemplateInput, {
    nullable: true,
    description: 'CardTemplate data for Card Callouts.',
  })
  canvasTemplate?: CreateCanvasTemplateInput;
}
