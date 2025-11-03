import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { Type } from 'class-transformer';
import { NameID } from '@domain/common/scalars';
import { CreateWhiteboardPreviewSettingsInput } from './whiteboard.preview.settings.dto.create';

@InputType()
@ObjectType('CreateWhiteboardData')
export class CreateWhiteboardInput {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile?: CreateProfileInput;

  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID?: string;

  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;

  @Field(() => CreateWhiteboardPreviewSettingsInput, {
    nullable: true,
    description: 'The preview settings for the whiteboard.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWhiteboardPreviewSettingsInput)
  previewSettings?: CreateWhiteboardPreviewSettingsInput;
}
