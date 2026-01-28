import { VisualType } from '@common/enums/visual.type';

export class CreateVisualInput {
  name!: VisualType;

  minWidth!: number;

  maxWidth!: number;

  minHeight!: number;

  maxHeight!: number;

  aspectRatio!: number;
}
