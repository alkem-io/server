import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { SelectionFilterType } from './selection.filter.type.enum';
import { SelectionCriteria } from '../criteria/selection.criteria.entity';
import { ISelectionFilter } from './selection.filter.interface';

@Entity()
export class SelectionFilter
  extends BaseAlkemioEntity
  implements ISelectionFilter
{
  @Column()
  type!: SelectionFilterType;

  @Column()
  value!: string;

  @ManyToOne(() => SelectionCriteria, criteria => criteria.filters, {
    onDelete: 'CASCADE',
  })
  selectionCriteria!: SelectionCriteria;
}
