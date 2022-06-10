import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateInfo } from '../template-info/template.info.interface';

@ObjectType('ITemplateBase')
export abstract class ITemplateBase extends IAuthorizable {
  @Field(() => ITemplateInfo, {
    name: 'info',
    nullable: false,
    description: 'The meta information for this Template',
  })
  templateInfo?: ITemplateInfo;
}
