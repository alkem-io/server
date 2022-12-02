import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToOne,
} from 'typeorm';
import { ICanvasTemplate } from '@domain/template/canvas-template/canvas.template.interface';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { compressText, decompressText } from '@common/utils/compression.util';

@Entity()
export class CanvasTemplate extends TemplateBase implements ICanvasTemplate {
  constructor() {
    super();
    this.value = '';
  }

  @BeforeInsert()
  @BeforeUpdate()
  async compressValue() {
    if (this.value !== '') {
      this.value = await compressText(this.value);
    }
  }

  @AfterInsert()
  @AfterUpdate()
  @AfterLoad()
  async decompressValue() {
    if (this.value !== '') {
      this.value = await decompressText(this.value);
    }
  }

  @ManyToOne(() => TemplatesSet, templatesSet => templatesSet.canvasTemplates, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  templatesSet?: TemplatesSet;

  @Column('longtext', { nullable: false })
  value!: string;
}
