import { JoinColumn, OneToOne } from 'typeorm';
import { ITemplateBase } from './template.base.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { TemplateInfo } from '../template-info/template.info.entity';

export abstract class TemplateBase
  extends AuthorizableEntity
  implements ITemplateBase
{
  constructor() {
    super();
  }

  @OneToOne(() => TemplateInfo, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templateInfo!: TemplateInfo;
}
