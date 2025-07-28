import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

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

  @Field(() => Markdown, {
    nullable: true,
    description: 'The new content to be used.',
  })
  @IsOptional()
  memoContent?: string;
}
