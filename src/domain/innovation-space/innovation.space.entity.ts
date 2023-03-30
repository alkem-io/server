import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { SelectionCriteria } from './selection/criteria/selection.criteria.entity';
import { InnovationSpaceType } from './innovation.space.type.enum';
import { Branding } from './branding/branding.entity';
import { IInnovationSpace } from './innovation.space.interface';

@Entity()
export class InnovationSpace
  extends NameableEntity
  implements IInnovationSpace
{
  @OneToOne(() => SelectionCriteria)
  @JoinColumn()
  selectionCriteria!: SelectionCriteria;

  @Column()
  type!: InnovationSpaceType;

  @OneToOne(() => Branding, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn()
  branding?: Branding;
}
