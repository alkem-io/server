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
