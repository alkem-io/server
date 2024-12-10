import { registerEnumType } from '@nestjs/graphql';

export enum VisualType {
  AVATAR = 'avatar',
  BANNER = 'banner',
  CARD = 'card',
  BANNER_WIDE = 'bannerWide',
}

registerEnumType(VisualType, {
  name: 'VisualType',
});

export function validateAndConvertVisualTypeName(name: string): VisualType {
  if (Object.values(VisualType).includes(name as VisualType)) {
    return name as VisualType;
  } else {
    throw new Error(`Invalid VisualType: ${name}`);
  }
}
