import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { ITemplate } from '@domain/template/template/template.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceDefaults')
export abstract class ISpaceDefaults extends IAuthorizable {
  @Field(() => ITemplate, {
    nullable: true,
    description:
      'The innovation flow template to use for new Challenges / Opportunities.',
  })
  innovationFlowTemplate?: ITemplate;
}
