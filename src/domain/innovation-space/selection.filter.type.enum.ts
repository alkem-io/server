import { registerEnumType } from '@nestjs/graphql';

export enum SelectionFilterType {
  VISIBILITY = 'visibility',
}

registerEnumType(SelectionFilterType, {
  name: 'SelectionFilterType',
});
