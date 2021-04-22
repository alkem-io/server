import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  InvalidStateTransitionException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { State, createMachine, interpret, MachineOptions } from 'xstate';
import { FindOneOptions, Repository } from 'typeorm';
import { Lifecycle } from './lifecycle.entity';
import { ILifecycle } from './lifecycle.interface';
import { LifecycleEventInput } from './lifecycle.dto.event';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LifecycleService {
  constructor(
    @InjectRepository(Lifecycle)
    private lifecycleRepository: Repository<Lifecycle>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createLifecycle(
    parentID: string,
    machineConfig: any
  ): Promise<ILifecycle> {
    // Ensure parent is set
    machineConfig.context.parentID = parentID;
    const machineConfigStr = JSON.stringify(machineConfig);
    const lifecycle = new Lifecycle(machineConfigStr);

    return await this.lifecycleRepository.save(lifecycle);
  }

  async event(
    lifecycleEventData: LifecycleEventInput,
    options: Partial<MachineOptions<any, any>>
  ): Promise<ILifecycle> {
    const lifecycle = await this.getLifecycleByIdOrFail(lifecycleEventData.ID);
    const eventName = lifecycleEventData.eventName;
    const machineDef = JSON.parse(lifecycle.machineDef);

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
    const parentID = machineDef.context.parentID;

    const startState = restoredState.value.toString();
    machineService.send({
      type: eventName,
      parentID: parentID,
    });
    this.logger.verbose?.(
      `Lifecycle (id: ${
        lifecycle.id
      }) event '${eventName}: from state '${startState}' to state '${machineService.state.value.toString()}', parentID: ${parentID}`,
      LogContext.LIFECYCLE
    );

    const newStateStr = JSON.stringify(machineService.state);
    lifecycle.machineState = newStateStr;

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
    const machineDef = JSON.parse(lifecycle.machineDef);
    const machine = createMachine(machineDef);

    const stateStr = lifecycle.machineState;
    if (!stateStr) {
      // no state stored, return initial state
      return machine.initialState;
    }
    return JSON.parse(stateStr);
  }

  getState(lifecycle: ILifecycle): string {
    const restoredStateDef = this.getRestoredStateDefinition(lifecycle);
    return State.create(restoredStateDef).value.toString();
  }

  getTemplateIdentifier(lifecycle: ILifecycle): string {
    const templateID = JSON.parse(lifecycle.machineDef).id;
    return templateID;
  }

  getNextEvents(lifecycle: ILifecycle): string[] {
    const machineDef = JSON.parse(lifecycle.machineDef);
    const machine = createMachine(machineDef);
    const restoredStateDefinition = this.getRestoredStateDefinition(lifecycle);
    const restoredState = machine.resolveState(restoredStateDefinition);
    const next = restoredState.nextEvents;
    return next || [];
  }

  getMachineDefinition(lifecycle: ILifecycle): any {
    return JSON.parse(lifecycle.machineDef);
  }

  async getParentID(lifecycle: ILifecycle) {
    const machineDefJson = JSON.parse(lifecycle.machineDef);
    return machineDefJson.context.parentID;
  }

  async save(lifecycle: Lifecycle): Promise<Lifecycle> {
    return await this.lifecycleRepository.save(lifecycle);
  }
}
