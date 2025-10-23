import { VisualType } from '@common/enums/visual.type';
import { Field, ObjectType } from '@nestjs/graphql';

export const VISUAL_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
] as const;

export const DEFAULT_VISUAL_CONSTRAINTS = {
  [VisualType.AVATAR]: {
    minWidth: 190,
    maxWidth: 410,
    minHeight: 190,
    maxHeight: 410,
    aspectRatio: 1,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.BANNER]: {
    minWidth: 384,
    maxWidth: 1536,
    minHeight: 64,
    maxHeight: 256,
    aspectRatio: 6,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.WHITEBOARD_PREVIEW]: {
    minWidth: 500,
    maxWidth: 1800,
    minHeight: 200,
    maxHeight: 720,
    aspectRatio: 2.5,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.CARD]: {
    minWidth: 307,
    maxWidth: 410,
    minHeight: 192,
    maxHeight: 256,
    aspectRatio: 1.6,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
  [VisualType.BANNER_WIDE]: {
    minWidth: 640,
    maxWidth: 2560,
    minHeight: 64,
    maxHeight: 256,
    aspectRatio: 10,
    allowedTypes: VISUAL_ALLOWED_TYPES,
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

  @Field(() => [String], {
    description: 'Allowed file types.',
  })
  allowedTypes!: typeof VISUAL_ALLOWED_TYPES;
}
