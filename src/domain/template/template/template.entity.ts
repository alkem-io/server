import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { TemplateType } from '@common/enums/template.type';
import { ITemplate } from './template.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';

@Entity()
export class Template extends AuthorizableEntity implements ITemplate {
  @ManyToOne(() => TemplatesSet, templatesSet => templatesSet.templates, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  templatesSet?: TemplatesSet;

  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @Column('varchar', { length: 255, nullable: false })
  type!: TemplateType;

  @Column('text', { nullable: true })
  postDefaultDescription?: string;

  @Column('text', { nullable: true })
  innovationFlowState: string = '[]';
}
