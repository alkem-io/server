import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('WhiteboardPreviewCoordinates')
export abstract class IWhiteboardPreviewCoordinates {
  @Field(() => Number, {
    description: 'The x coordinate.',
    nullable: false,
  })
  x!: number;

  @Field(() => Number, {
    description: 'The y coordinate.',
    nullable: false,
  })
  y!: number;

  @Field(() => Number, {
    description: 'The height.',
    nullable: false,
  })
  height!: number;

  @Field(() => Number, {
    description: 'The width.',
    nullable: false,
  })
  width!: number;
}

@ObjectType('WhiteboardPreviewSettings')
export abstract class IWhiteboardPreviewSettings {
  @Field(() => WhiteboardPreviewMode, {
    description: `The preview mode.
      AUTO: Generate Whiteboard preview automatically when closing the dialog
      CUSTOM: Generate Whiteboard preview based on user-defined coordinates when closing the dialog
      FIXED: Use a fixed Whiteboard preview that does not change when closing the dialog
    `,
    nullable: false,
  })
  mode!: WhiteboardPreviewMode;

  @Field(() => IWhiteboardPreviewCoordinates, {
    description: 'The coordinates for the preview.',
    nullable: true,
  })
  coordinates: IWhiteboardPreviewCoordinates | null = null;
}
