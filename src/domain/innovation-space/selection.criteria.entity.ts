import { Column, Entity, OneToMany } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { SelectionFilter } from './selection.filter.entity';
import { SelectionCriteriaType } from './selection.criteria.type';

@Entity()
export class SelectionCriteria extends BaseAlkemioEntity {
  @OneToMany(() => SelectionFilter, filter => filter.id, {
    eager: false,
    cascade: false,
  })
  filters!: SelectionFilter[];

  @Column()
  type!: SelectionCriteriaType;
}
