import { ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';
import { ITemplatesSet } from '../templates-set/templates.set.interface';

@ObjectType('InnovationFlowTemplate')
export abstract class IInnovationFlowTemplate extends ITemplateBase {
  states!: string;

  templatesSet?: ITemplatesSet;
}
