import { ValidationException } from '@common/exceptions';
import { registerEnumType } from '@nestjs/graphql';
import { LogContext } from './logging.context';

export enum VisualType {
  AVATAR = 'avatar',
  BANNER = 'banner',
  WHITEBOARD_PREVIEW = 'whiteboardPreview',
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
    throw new ValidationException(
      `Invalid VisualType: ${name}`,
      LogContext.PROFILE
    );
  }
}
