import { Column, Entity, OneToMany } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { SelectionFilter } from '../filter/selection.filter.entity';
import { SelectionCriteriaType } from './selection.criteria.type.enum';
import { ISelectionCriteria } from './selection.criteria.interface';

@Entity()
export class SelectionCriteria
  extends BaseAlkemioEntity
  implements ISelectionCriteria
{
  @OneToMany(() => SelectionFilter, filter => filter.id, {
    eager: false,
    cascade: false,
  })
  filters!: SelectionFilter[];

  @Column()
  type!: SelectionCriteriaType;
}
