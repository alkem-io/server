import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IPostTemplate } from '@domain/template/post-template/post.template.interface';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { Profile } from '@domain/common/profile';

@Entity()
export class PostTemplate extends TemplateBase implements IPostTemplate {
  @Index('FK_59991450cf75dc486700ca034c6')
  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @Index('FK_66666450cf75dc486700ca034c6')
  @ManyToOne(() => TemplatesSet, templatesSet => templatesSet.postTemplates, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  templatesSet?: TemplatesSet;

  @Column('text')
  defaultDescription: string;

  @Column('text')
  type: string;

  constructor() {
    super();
    this.type = '';
    this.defaultDescription = '';
  }
}
