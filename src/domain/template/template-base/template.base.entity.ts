import { Column } from 'typeorm';
import { ITemplateBase } from './template.base.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';

export abstract class TemplateBase
  extends BaseAlkemioEntity
  implements ITemplateBase
{
  constructor(title: string) {
    super();
    this.title = title;
  }

  @Column()
  title!: string;
}
