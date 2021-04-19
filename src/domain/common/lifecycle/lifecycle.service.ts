import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  InvalidStateTransitionException,
} from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { State, createMachine, interpret, MachineOptions } from 'xstate';
import { FindOneOptions, Repository } from 'typeorm';
import { Lifecycle } from './lifecycle.entity';
import { ILifecycle } from './lifecycle.interface';
import { LifecycleEventInput } from './lifecycle.dto.transition';

@Injectable()
export class LifecycleService {
  constructor(
    @InjectRepository(Lifecycle)
    private lifecycleRepository: Repository<Lifecycle>
  ) {}

  async createLifecycle(config: string): Promise<ILifecycle> {
    const lifecycle = new Lifecycle(config);
    return await this.lifecycleRepository.save(lifecycle);
  }

  async event(
    lifecycleEventData: LifecycleEventInput,
    options: Partial<MachineOptions<any, any>>
  ): Promise<ILifecycle> {
    const lifecycle = await this.getLifecycleByIdOrFail(lifecycleEventData.ID);
    const eventName = lifecycleEventData.eventName;
    const machineDef = JSON.parse(lifecycle.machine);

    const machine = createMachine(machineDef, options);
    const machineWithContext = machine.withContext({
      ...machine.context,
    });
    const restoredStateDef = this.getRestoredStateDefinition(lifecycle);
    const restoredState = State.create(restoredStateDef);

    const nextStates = machineWithContext.resolveState(restoredStateDef)
      .nextEvents;
    if (
      !nextStates.find(name => {
        return name === eventName;
      })
    ) {
      throw new InvalidStateTransitionException(
        `Unable to update state: provided event (${eventName}) not in valid set of next events: ${nextStates}`,
        LogContext.LIFECYCLE
      );
    }

    const machineService = interpret(machineWithContext).start(restoredState);

    machineService.send({
      type: eventName,
      parentID: machineDef.context.parentID,
    });

    const newStateStr = JSON.stringify(machineService.state);
    lifecycle.state = newStateStr;

    machineService.stop();
    return await this.lifecycleRepository.save(lifecycle);
  }

  async getLifecycleByIdOrFail(
    lifecycleID: number,
    options?: FindOneOptions<Lifecycle>
  ): Promise<ILifecycle> {
    const lifecycle = await this.lifecycleRepository.findOne(
      { id: lifecycleID },
      options
    );
    if (!lifecycle)
      throw new EntityNotFoundException(
        `Unable to find Lifecycle with ID: ${lifecycleID}`,
        LogContext.CHALLENGES
      );
    return lifecycle;
  }

  getRestoredStateDefinition(lifecycle: ILifecycle) {
    const machineDef = JSON.parse(lifecycle.machine);
    const machine = createMachine(machineDef);
    let previousStateJson = machine.initialState;

    const stateStr = lifecycle.state;
    if (stateStr.length > 0) {
      previousStateJson = JSON.parse(stateStr);
    }
    return previousStateJson;
  }

  getState(lifecycle: ILifecycle): string {
    const restoredStateDef = this.getRestoredStateDefinition(lifecycle);
    return State.create(restoredStateDef).value.toString();
  }

  getNextEvents(lifecycle: ILifecycle): string[] {
    const machineDef = JSON.parse(lifecycle.machine);
    const machine = createMachine(machineDef);
    const restoredStateDefinition = this.getRestoredStateDefinition(lifecycle);
    const restoredState = machine.resolveState(restoredStateDefinition);
    const next = restoredState.nextEvents;
    return next || [];
  }

  async storeParentID(lifecycle: ILifecycle, parentID: string) {
    const machineDefJson = JSON.parse(lifecycle.machine);
    machineDefJson.context.parentID = parentID;
    lifecycle.machine = JSON.stringify(machineDefJson);
    return await this.save(lifecycle as Lifecycle);
  }

  async getParentID(lifecycle: ILifecycle) {
    const machineDefJson = JSON.parse(lifecycle.machine);
    return machineDefJson.context.parentID;
  }

  async save(lifecycle: Lifecycle): Promise<Lifecycle> {
    return await this.lifecycleRepository.save(lifecycle);
  }
}
