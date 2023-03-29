import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { SelectionFilterType } from '@domain/innovation-space/selection.filter.type.enum';

@ObjectType({
  description: 'Filter used to filter the data for the Innovation space',
})
export class ISelectionFilter extends IBaseAlkemio {
  @Field(() => SelectionFilterType, {
    description:
      'Type of the selection filter, which will also give a hint how to parse its value',
  })
  type!: SelectionFilterType;

  @Field(() => String, {
    description:
      'The filter value. Usage and how it can be parsed hinted by the type',
  })
  value!: string;
}
