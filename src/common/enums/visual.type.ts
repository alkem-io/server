import { registerEnumType } from '@nestjs/graphql';

export enum VisualType {
  AVATAR = 'avatar',
  BANNER = 'banner',
  CARD = 'bannerNarrow',
}

registerEnumType(VisualType, {
  name: 'VisualType',
});
