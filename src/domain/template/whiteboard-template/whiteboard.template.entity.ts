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
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { compressText, decompressText } from '@common/utils/compression.util';

@Entity()
export class WhiteboardTemplate
  extends TemplateBase
  implements IWhiteboardTemplate
{
  constructor() {
    super();
    this.content = '';
  }

  @BeforeInsert()
  @BeforeUpdate()
  async compressContent() {
    if (this.content !== '') {
      this.content = await compressText(this.content);
    }
  }

  @AfterInsert()
  @AfterUpdate()
  @AfterLoad()
  async decompressContent() {
    if (this.content !== '') {
      this.content = await decompressText(this.content);
    }
  }

  @ManyToOne(
    () => TemplatesSet,
    templatesSet => templatesSet.whiteboardTemplates,
    {
      eager: false,
      cascade: false,
      onDelete: 'NO ACTION',
    }
  )
  templatesSet?: TemplatesSet;

  @Column('longtext', { nullable: false })
  content!: string;
}
