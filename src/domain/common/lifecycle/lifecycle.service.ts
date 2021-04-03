import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  InvalidStateTransitionException,
} from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { State, createMachine, interpret } from 'xstate';
import { FindOneOptions, Repository } from 'typeorm';
import { Lifecycle } from './lifecycle.entity';
import { ILifecycle } from './lifecycle.interface';

@Injectable()
export class LifecycleService {
  constructor(
    @InjectRepository(Lifecycle)
    private lifecycleRepository: Repository<Lifecycle>
  ) {}

  async updateState(lifecycleID: number, event: string): Promise<ILifecycle> {
    const lifecycle = await this.getLifecycleByIdOrFail(lifecycleID);
    const machineDef = JSON.parse(lifecycle.machine);
    const machine = createMachine(machineDef);
    const restoredStateDef = this.getRestoredStateDefinition(lifecycle);
    const restoredState = State.create(restoredStateDef);

    const nextStates = machine.resolveState(restoredStateDef).nextEvents;
    if (!nextStates.find(name => name === event)) {
      throw new InvalidStateTransitionException(
        `Unable to update state: provided event (${event}) not in valid set of next events: ${nextStates}`,
        LogContext.LIFECYCLE
      );
    }

    const machineService = interpret(machine).start(restoredState);

    // machineService.subscribe(state => {
    //   console.log(state.value);
    // });

    machineService.send(event);

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
}
