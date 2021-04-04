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
import { applicationLifecycleActions } from '@domain/community/application/application.lifecycle.actions';
import { LifecycleActionsTypes } from '@common/enums/lifecycle.actions.types';

@Injectable()
export class LifecycleService {
  constructor(
    @InjectRepository(Lifecycle)
    private lifecycleRepository: Repository<Lifecycle>
  ) {}

  async updateState(lifecycleID: number, event: string): Promise<ILifecycle> {
    const lifecycle = await this.getLifecycleByIdOrFail(lifecycleID);
    const actions = this.getActions(lifecycle);
    const machine = createMachine(JSON.parse(lifecycle.machine), actions);
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

  // The lifecycle definition can be serialized as a string and stored at instantiation.
  // However the actions include functiton defitions which cannot be converted to JSON for
  // storage so need to have this function below. Far from ideal, open to better solutions...
  // Note: cannot look up on the parent of the lifecycle as there can be potentially
  // multiple lifecycles per challenge etc.
  getActions(lifecycle: ILifecycle) {
    if (lifecycle.actionsType === LifecycleActionsTypes.APPLICATION)
      return applicationLifecycleActions;
    throw new InvalidStateTransitionException(
      `Not recognised actions type on lifecycle: ${lifecycle.actionsType}`,
      LogContext.LIFECYCLE
    );
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
