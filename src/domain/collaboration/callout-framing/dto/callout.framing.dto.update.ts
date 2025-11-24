import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { UpdateLinkInput } from '@domain/collaboration/link/dto';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { UpdateWhiteboardPreviewSettingsInput } from '@domain/common/whiteboard/types';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpdateCalloutFramingInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of the Template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile?: UpdateProfileInput;

  @Field(() => CalloutFramingType, {
    nullable: true,
    description:
      'The type of additional content attached to the framing of the callout.',
  })
  @IsOptional()
  type?: CalloutFramingType;

  @Field(() => WhiteboardContent, {
    nullable: true,
    description: 'The new content to be used.',
  })
  @IsOptional()
  whiteboardContent?: string;

  @Field(() => UpdateWhiteboardPreviewSettingsInput, {
    nullable: true,
    description: 'The new preview settings for the Whiteboard.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateWhiteboardPreviewSettingsInput)
  whiteboardPreviewSettings?: UpdateWhiteboardPreviewSettingsInput;

  @Field(() => UpdateLinkInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateLinkInput)
  link?: UpdateLinkInput;

  @Field(() => Markdown, {
    nullable: true,
    description: 'The new markdown content for the Memo.',
  })
  @IsOptional()
  memoContent?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'The new content for the Poll.',
  })
  @IsOptional()
  pollContent?: any;
}
