import { VisualType } from '@common/enums/visual.type';
import { Field, ObjectType } from '@nestjs/graphql';

export const VISUAL_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
] as const;

export const MEDIA_GALLERY_VIDEO_ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
] as const;

// We still have some of these copied in the client.
// Keep in sync with client-web/src/domain/collaboration/whiteboard/WhiteboardVisuals/WhiteboardVisualsDimensions.ts
//
// `aspectRatio` is the DEFAULT shape for a newly created visual.
// `minAspectRatio`/`maxAspectRatio` bound what an editor may later change it to
// via `updateVisual`. For every type except BANNER they equal `aspectRatio`,
// i.e. the shape is fixed. BANNER is the one adjustable visual: a space admin
// can pick anything from 6 (the historic shape) to 10 (a slimmer strip).
//
// IMPORTANT — because the ratio is adjustable, BANNER's height bounds have to
// span the WHOLE ratio range rather than matching a single shape:
//   minHeight = ceil(minWidth / maxAspectRatio) = ceil(1200 / 10) = 120
//   maxHeight =      maxWidth / minAspectRatio  =      3840 / 6   = 640
// Narrowing them to one ratio would reject legitimate uploads at another.
export const DEFAULT_VISUAL_CONSTRAINTS = {
  [VisualType.AVATAR]: {
    minWidth: 190,
    maxWidth: 410,
    minHeight: 190,
    maxHeight: 410,
    aspectRatio: 1,
    minAspectRatio: 1,
    maxAspectRatio: 1,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.BANNER]: {
    minWidth: 1200,
    maxWidth: 3840,
    minHeight: 120,
    maxHeight: 640,
    aspectRatio: 6,
    minAspectRatio: 6,
    maxAspectRatio: 10,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.WHITEBOARD_PREVIEW]: {
    minWidth: 500,
    maxWidth: 1800,
    minHeight: 200,
    maxHeight: 720,
    aspectRatio: 2.5,
    minAspectRatio: 2.5,
    maxAspectRatio: 2.5,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.CARD]: {
    minWidth: 307,
    maxWidth: 410,
    minHeight: 192,
    maxHeight: 256,
    aspectRatio: 1.6,
    minAspectRatio: 1.6,
    maxAspectRatio: 1.6,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.BANNER_WIDE]: {
    minWidth: 640,
    maxWidth: 2560,
    minHeight: 64,
    maxHeight: 256,
    aspectRatio: 10,
    minAspectRatio: 10,
    maxAspectRatio: 10,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.MEDIA_GALLERY_IMAGE]: {
    minWidth: 1,
    maxWidth: 8000,
    minHeight: 1,
    maxHeight: 8000,
    aspectRatio: 1,
    minAspectRatio: 0.01,
    maxAspectRatio: 100,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.MEDIA_GALLERY_VIDEO]: {
    minWidth: 1,
    maxWidth: 8000,
    minHeight: 1,
    maxHeight: 8000,
    aspectRatio: 1,
    minAspectRatio: 0.01,
    maxAspectRatio: 100,
    allowedTypes: MEDIA_GALLERY_VIDEO_ALLOWED_TYPES,
  },
} as const;

@ObjectType('VisualConstraints')
export class VisualConstraints {
  @Field(() => Number, {
    description: 'Minimum width resolution.',
  })
  minWidth!: number;

  @Field(() => Number, {
    description: 'Maximum width resolution.',
  })
  maxWidth!: number;

  @Field(() => Number, {
    description: 'Minimum height resolution.',
  })
  minHeight!: number;

  @Field(() => Number, {
    description: 'Maximum height resolution.',
  })
  maxHeight!: number;

  @Field(() => Number, {
    description: 'Dimensions ratio width / height.',
  })
  aspectRatio!: number;

  @Field(() => Number, {
    description:
      'Minimum dimensions ratio width / height that this visual may be set to. Equal to maxAspectRatio when the shape is fixed.',
  })
  minAspectRatio!: number;

  @Field(() => Number, {
    description:
      'Maximum dimensions ratio width / height that this visual may be set to. Equal to minAspectRatio when the shape is fixed.',
  })
  maxAspectRatio!: number;

  @Field(() => [String], {
    description: 'Allowed file types.',
  })
  allowedTypes!: readonly string[];
}
