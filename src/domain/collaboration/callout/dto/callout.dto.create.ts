import { Field, InputType } from '@nestjs/graphql';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePostTemplateInput } from '@domain/template/post-template/dto/post.template.dto.create';
import { CreateWhiteboardTemplateInput } from '@domain/template/whiteboard-template/dto/whiteboard.template.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { CalloutDisplayLocation } from '@common/enums/callout.display.location';
import { CalloutVisibility } from '@common/enums/callout.visibility';

@InputType()
export class CreateCalloutInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;

  @Field(() => CalloutType, {
    description: 'Callout type.',
  })
  type!: CalloutType;

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;

  @Field(() => CalloutDisplayLocation, {
    nullable: true,
    description: 'Set callout display location for this Callout.',
  })
  displayLocation?: CalloutDisplayLocation;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => CalloutVisibility, {
    nullable: true,
    description: 'Visibility of the Callout. Defaults to DRAFT.',
  })
  visibility?: CalloutVisibility;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Send notification if this flag is true and visibility is PUBLISHED. Defaults to false.',
  })
  sendNotification?: boolean;

  @Field(() => CreatePostTemplateInput, {
    nullable: true,
    description: 'PostTemplate data for Post Callouts.',
  })
  postTemplate?: CreatePostTemplateInput;

  @Field(() => CreateWhiteboardTemplateInput, {
    nullable: true,
    description: 'WhiteboardTemplate data for whiteboard Callouts.',
  })
  whiteboardTemplate?: CreateWhiteboardTemplateInput;

  @Field(() => CreateWhiteboardInput, {
    nullable: true,
    description: 'Whiteboard data for whiteboard Callouts.',
  })
  whiteboard?: CreateWhiteboardInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
