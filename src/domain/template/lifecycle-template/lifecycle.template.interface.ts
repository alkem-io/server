import { LifecycleType } from '@common/enums/lifecycle.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';
import { LifecycleDefinitionScalar } from '@domain/common/scalars/scalar.lifecycle.definition';
import { ITemplatesSet } from '../templates-set';

@ObjectType('LifecycleTemplate')
export abstract class ILifecycleTemplate extends ITemplateBase {
  @Field(() => LifecycleType, {
    nullable: false,
    description: 'The type for this LifecycleTemplate.',
  })
  type!: string;

  @Field(() => LifecycleDefinitionScalar, {
    nullable: false,
    description: 'The XState definition for this LifecycleTemplate.',
  })
  definition!: string;

  templatesSet?: ITemplatesSet;
}
