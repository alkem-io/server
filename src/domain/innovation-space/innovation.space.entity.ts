import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { SelectionCriteria } from './selection.criteria.entity';
import { InnovationSpaceType } from './innovation.space.type.enum';
import { Organization } from '@src/domain';
import { Branding } from '@domain/innovation-space/branding.entity';

@Entity()
export class InnovationSpace extends NameableEntity {
  @OneToOne(() => SelectionCriteria, {
    onDelete: 'SET NULL',
  })
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
  })
  @JoinColumn()
  branding!: Branding;
}
