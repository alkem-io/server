// todo: type is not the best naming
import { registerEnumType } from '@nestjs/graphql';

export enum SelectionCriteriaType {
  AND = 'AND',
  OR = 'OR',
}

registerEnumType(SelectionCriteriaType, {
  name: 'SelectionCriteriaType',
});
