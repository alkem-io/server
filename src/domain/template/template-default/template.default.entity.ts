import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ITemplateDefault } from './template.default.interface';
import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { Template } from '../template/template.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TemplateType } from '@common/enums/template.type';
import { TemplatesManager } from '@domain/template/templates-manager';
import { IsEnum } from 'class-validator';

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
