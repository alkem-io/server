import { registerEnumType } from '@nestjs/graphql';

export enum CanvasCheckoutStateEnum {
  AVAILABLE = 'available',
  CHECKED_OUT = 'checked-out',
}

registerEnumType(CanvasCheckoutStateEnum, {
  name: 'CanvasCheckoutStateEnum',
});
