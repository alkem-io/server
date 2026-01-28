import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ITemplateDefault } from '../template-default/template.default.interface';
import { ITemplatesSet } from '../templates-set/templates.set.interface';

@ObjectType('TemplatesManager')
export abstract class ITemplatesManager extends IAuthorizable {
  templatesSet?: ITemplatesSet;
  templateDefaults!: ITemplateDefault[];
}
