import { Column, JoinColumn, OneToOne } from 'typeorm';
import { ITemplateBase } from './template.base.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { Visual } from '@domain/common/visual/visual.entity';

export abstract class TemplateBase
  extends BaseAlkemioEntity
  implements ITemplateBase
{
  constructor() {
    super();
  }

  @Column()
  title!: string;

  @Column()
  description!: string;

  @OneToOne(() => Tagset, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  tagset!: Tagset;

  @OneToOne(() => Visual, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  visual?: Visual;
}
