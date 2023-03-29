import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { SelectionFilterType } from './selection.filter.type.enum';
import { SelectionCriteria } from './selection.criteria.entity';

@Entity()
export class SelectionFilter extends BaseAlkemioEntity {
  @Column()
  type!: SelectionFilterType;

  @Column()
  value!: string;

  @ManyToOne(() => SelectionCriteria, criteria => criteria.filters, {
    onDelete: 'SET NULL',
  })
  selectionCriteria!: SelectionCriteria;
}
