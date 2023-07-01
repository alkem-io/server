import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { IBaseAlkemio } from '../entity/base-entity';

export abstract class ITagsetTemplateSet extends IBaseAlkemio {
  tagsetTemplates!: ITagsetTemplate[];
}
