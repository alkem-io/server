import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { SelectionCriteriaType } from './selection.criteria.type';
import { ISelectionFilter } from './selection.filter.interface';

@ObjectType('SelectionCriteria')
export class ISelectionCriteria extends IBaseAlkemio {
  @Field(() => [ISelectionFilter])
  filters!: ISelectionFilter[];

  @Field(() => String)
  type!: SelectionCriteriaType;
}
