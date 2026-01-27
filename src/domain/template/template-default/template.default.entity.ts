import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IsEnum } from 'class-validator';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Template } from '../template/template.entity';
import { TemplatesManager } from '../templates-manager/templates.manager.entity';
import { ITemplateDefault } from './template.default.interface';

@Entity()
export class TemplateDefault
  extends AuthorizableEntity
  implements ITemplateDefault
{
  @ManyToOne(
    () => TemplatesManager,
    templatesManager => templatesManager.templateDefaults,
    {
      eager: false,
      cascade: false,
      onDelete: 'NO ACTION',
    }
  )
  templatesManager?: TemplatesManager;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: TemplateDefaultType;

  @OneToOne(() => Template, {
    eager: true,
    cascade: false, // important not to cascade
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  template?: Template;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  @IsEnum(TemplateType)
  allowedTemplateType!: TemplateType;
}
