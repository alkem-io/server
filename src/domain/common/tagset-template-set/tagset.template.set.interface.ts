import { ITagsetTemplate } from '@domain/common/tagset-template';
import { IBaseAlkemio } from '../entity/base-entity';

export abstract class ITagsetTemplateSet extends IBaseAlkemio {
  tagsetTemplates!: ITagsetTemplate[];
}
