import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { WhiteboardPreviewCoordinatesInput } from './whiteboard.preview.settings.coordinates.dto';
import { Type } from 'class-transformer';

@InputType()
export class UpdateWhiteboardPreviewSettingsInput {
  @Field(() => WhiteboardPreviewMode, {
    nullable: true,
    description: `The preview mode.
      AUTO: Generate Whiteboard preview automatically when closing the dialog
      CUSTOM: Generate Whiteboard preview based on user-defined coordinates when closing the dialog
      FIXED: Use a fixed Whiteboard preview that does not change when closing the dialog
    `,
  })
  @IsOptional()
  mode?: WhiteboardPreviewMode;

  @Field(() => WhiteboardPreviewCoordinatesInput, {
    nullable: true,
    description: 'The coordinates for the preview.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WhiteboardPreviewCoordinatesInput)
  coordinates?: WhiteboardPreviewCoordinatesInput | null;
}
