import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { Visual } from '@domain/common/visual/visual.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { ITemplateInfo } from './template.info.interface';

@Entity()
export class TemplateInfo extends BaseAlkemioEntity implements ITemplateInfo {
  @Column()
  title!: string;

  @Column()
  description!: string;

  @OneToOne(() => Tagset, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  tagset!: Tagset;

  @OneToOne(() => Visual, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  visual?: Visual;

  constructor() {
    super();
  }
}
