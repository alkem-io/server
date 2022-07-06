import { LifecycleType } from '@common/enums/lifecycle.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';
import JSON from 'graphql-type-json';

@ObjectType('LifecycleTemplate')
export abstract class ILifecycleTemplate extends ITemplateBase {
  @Field(() => LifecycleType, {
    nullable: false,
    description: 'The type for this LifecycleTemplate.',
  })
  type!: string;

  @Field(() => JSON, {
    nullable: true,
    description: 'The XState definition for this LifecycleTemplate.',
  })
  definition?: string;
}
