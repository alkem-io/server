import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { Library } from '../library/library.entity';
import { IInnovationPack } from './innovation.pack.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';

@Entity()
export class InnovationPack extends NameableEntity implements IInnovationPack {
  @ManyToOne(() => Library, library => library.innovationPacks, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  library?: Library;

  @OneToOne(() => TemplatesSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesSet?: TemplatesSet;

  templatesCount = 0;
}
