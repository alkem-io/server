import { registerEnumType } from '@nestjs/graphql';

export enum CanvasCheckoutStateEnum {
  AVAILABLE = 'available',
  CHECKED_OUT = 'checkedOut',
}

registerEnumType(CanvasCheckoutStateEnum, {
  name: 'CanvasCheckoutStateEnum',
});
