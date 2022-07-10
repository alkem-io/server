import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { LifecycleDefinitionScalar } from '../scalars/scalar.lifecycle.definition';

@ObjectType('Lifecycle')
export abstract class ILifecycle extends IBaseAlkemio {
  machineState?: string;

  @Field(() => LifecycleDefinitionScalar, {
    description:
      'The machine definition, describing the states, transitions etc for this Lifeycle.',
  })
  machineDef!: string;
}
