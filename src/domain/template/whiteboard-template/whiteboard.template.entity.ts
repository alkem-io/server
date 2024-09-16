import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { compressText, decompressText } from '@common/utils/compression.util';
import { Profile } from '@domain/common/profile';

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

  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @Column('longtext', { nullable: false })
  content!: string;
}
