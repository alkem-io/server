import { Field, InputType } from '@nestjs/graphql';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePostTemplateInput } from '@domain/template/post-template/dto/post.template.dto.create';
import { CreateWhiteboardTemplateInput } from '@domain/template/whiteboard-template/dto/whiteboard.template.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';

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

  @Field(() => String, {
    nullable: true,
    description: 'Set callout group for this Callout.',
  })
  group?: string;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => CreatePostTemplateInput, {
    nullable: true,
    description: 'PostTemplate data for Card Callouts.',
  })
  postTemplate?: CreatePostTemplateInput;

  @Field(() => CreateWhiteboardTemplateInput, {
    nullable: true,
    description: 'WhiteboardTemplate data for whiteboard Callouts.',
  })
  whiteboardTemplate?: CreateWhiteboardTemplateInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
