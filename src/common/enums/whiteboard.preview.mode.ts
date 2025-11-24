import { registerEnumType } from '@nestjs/graphql';

export enum WhiteboardPreviewMode {
  AUTO = 'auto', // Generate Whiteboard preview automatically when closing the dialog
  CUSTOM = 'custom', // Generate Whiteboard preview based on user-defined coordinates when closing the dialog
  FIXED = 'fixed', // Use a fixed Whiteboard preview that does not change when closing the dialog
}

registerEnumType(WhiteboardPreviewMode, {
  name: 'WhiteboardPreviewMode',
});
