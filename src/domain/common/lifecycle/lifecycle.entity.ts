import { Column, Entity } from 'typeorm';
import { ILifecycle } from './lifecycle.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
@Entity()
export class Lifecycle extends BaseAlkemioEntity implements ILifecycle {
  // Stores the xstate current state representation
  @Column('text', { nullable: true })
  machineState?: string;

  // Stores the xstate engine definition
  @Column('text', { nullable: true })
  machineDef: string;

  constructor(machine: any) {
    super();
    this.machineDef = machine;
  }
}
