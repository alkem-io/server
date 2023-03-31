import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISelectionFilter } from '../filter/selection.filter.interface';
import { SelectionCriteriaType } from './selection.criteria.type.enum';

@ObjectType('SelectionCriteria')
export abstract class ISelectionCriteria extends IBaseAlkemio {
  @Field(() => [ISelectionFilter])
  filters!: ISelectionFilter[];

  @Field(() => SelectionCriteriaType)
  type!: SelectionCriteriaType;
}
