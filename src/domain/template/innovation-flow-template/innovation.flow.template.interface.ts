import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';
import { LifecycleDefinitionScalar } from '@domain/common/scalars/scalar.lifecycle.definition';
import { ITemplatesSet } from '../templates-set';

@ObjectType('InnovationFlowTemplate')
export abstract class IInnovationFlowTemplate extends ITemplateBase {
  @Field(() => InnovationFlowType, {
    nullable: false,
    description: 'The type for this InnovationFlowTemplate.',
  })
  type!: string;

  @Field(() => LifecycleDefinitionScalar, {
    nullable: false,
    description: 'The XState definition for this InnovationFlowTemplate.',
  })
  definition!: string;

  templatesSet?: ITemplatesSet;
}
