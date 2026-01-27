import { IBaseAlkemio } from '../entity/base-entity';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';

export abstract class ITagsetTemplateSet extends IBaseAlkemio {
  tagsetTemplates!: ITagsetTemplate[];
}
