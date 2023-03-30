import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { SelectionCriteria } from './selection/criteria/selection.criteria.entity';
import { InnovationSpaceType } from './innovation.space.type.enum';
import { Organization } from '@src/domain';
import { Branding } from '@domain/innovation-space/branding/branding.entity';
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

  @Column('text', {
    nullable: true,
  })
  description?: string;

  @OneToOne(() => Organization, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn()
  organization?: Organization;

  @OneToOne(() => Branding, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn()
  branding?: Branding;
}
