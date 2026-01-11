import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { ITemplateDefault } from '../template-default/template.default.interface';

@ObjectType('TemplatesManager')
export abstract class ITemplatesManager extends IAuthorizable {
  templatesSet?: ITemplatesSet;
  templateDefaults!: ITemplateDefault[];
}
