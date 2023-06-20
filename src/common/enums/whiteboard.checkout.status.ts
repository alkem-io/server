import { registerEnumType } from '@nestjs/graphql';

export enum WhiteboardCheckoutStateEnum {
  AVAILABLE = 'available',
  CHECKED_OUT = 'checkedOut',
}

registerEnumType(WhiteboardCheckoutStateEnum, {
  name: 'WhiteboardCheckoutStateEnum',
});
