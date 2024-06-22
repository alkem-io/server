import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IInnovationFlowTemplate } from '@domain/template/innovation-flow-template/innovation.flow.template.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceDefaults')
export abstract class ISpaceDefaults extends IAuthorizable {
  @Field(() => IInnovationFlowTemplate, {
    nullable: true,
    description:
      'The innovation flow template to use for new Challenges / Opportunities.',
  })
  innovationFlowTemplate?: IInnovationFlowTemplate;
}
