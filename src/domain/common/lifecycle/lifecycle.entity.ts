import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ILifecycle } from './lifecycle.interface';

export class Lifecycle extends BaseAlkemioEntity implements ILifecycle {
  // Stores the xstate current state representation
  machineState?: string;
}
