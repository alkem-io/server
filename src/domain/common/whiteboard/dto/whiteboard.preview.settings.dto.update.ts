import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateWhiteboardPreviewCoordinatesInput {
  @Field(() => Number, {
    nullable: false,
    description: 'The x coordinate.',
  })
  x!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The y coordinate.',
  })
  y!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The height.',
  })
  height!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The width.',
  })
  width!: number;
}

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

  @Field(() => UpdateWhiteboardPreviewCoordinatesInput, {
    nullable: true,
    description: 'The coordinates for the preview.',
  })
  @IsOptional()
  coordinates?: UpdateWhiteboardPreviewCoordinatesInput | null;
}
