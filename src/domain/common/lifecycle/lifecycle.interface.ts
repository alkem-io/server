import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('Lifecycle')
export abstract class ILifecycle extends IBaseAlkemio {
  machineState?: string;
}
