import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplate } from '../template/template.interface';
import { ITemplatesManager } from '../templates-manager';

@ObjectType('TemplateDefault')
export abstract class ITemplateDefault extends IAuthorizable {
  @Field(() => TemplateDefaultType, {
    nullable: false,
    description: 'The type of this TemplateDefault.',
  })
  type!: TemplateDefaultType;

  template?: ITemplate;

  @Field(() => TemplateType, {
    nullable: false,
    description: 'The type of any Template stored here.',
  })
  allowedTemplateType!: TemplateType;

  templatesManager?: ITemplatesManager;
}
