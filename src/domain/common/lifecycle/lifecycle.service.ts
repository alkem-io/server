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
import { LifecycleEventInput } from './dto/lifecycle.dto.event';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

@Injectable()
export class LifecycleService {
  constructor(
    @InjectRepository(Lifecycle)
    private lifecycleRepository: Repository<Lifecycle>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createLifecycle(
    parentID: string,
    machineConfig: ILifecycleDefinition
  ): Promise<ILifecycle> {
    // Ensure parent is set
    if (machineConfig.context) {
      machineConfig.context.parentID = parentID;
    }
    const machineConfigStr = this.serializeLifecycleDefinition(machineConfig);
    const lifecycle = new Lifecycle(machineConfigStr);

    return await this.lifecycleRepository.save(lifecycle);
  }

  async deleteLifecycle(lifecycleID: string): Promise<ILifecycle> {
    const lifecycle = await this.getLifecycleOrFail(lifecycleID);
    return await this.lifecycleRepository.remove(lifecycle as Lifecycle);
  }

  async event(
    lifecycleEventData: LifecycleEventInput,
    options: Partial<MachineOptions<any, any>>,
    agentInfo: AgentInfo,
    authorization?: IAuthorizationPolicy
  ): Promise<ILifecycle> {
    const lifecycle = await this.getLifecycleOrFail(lifecycleEventData.ID);
    const eventName = lifecycleEventData.eventName;
    const machineDef = this.deserializeLifecycleDefinition(
      lifecycle.machineDef
    );

    this.logger.verbose?.(
      `[Lifecycle] Processing event: ${lifecycleEventData.eventName}`,
      LogContext.LIFECYCLE
    );
    const machine = createMachine(machineDef, options);
    const machineWithLifecycle = machine.withContext({
      ...machine.context,
    });

    const restoredStateDef = this.getRestoredStateDefinition(lifecycle);
    const restoredState = State.create(restoredStateDef);

    const nextStates =
      machineWithLifecycle.resolveState(restoredStateDef).nextEvents;
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

    const interpretedLifecycle = interpret(machineWithLifecycle);
    this.logger.verbose?.(
      `[Lifecycle] machine interpreted, starting from state: ${restoredState.value.toString()}`,
      LogContext.LIFECYCLE
    );

    const machineService = interpretedLifecycle.start(restoredState);
    let parentID = '';
    if (machineDef.context && machine.context.parentID) {
      parentID = machineDef.context.parentID;
    }

    machineService.send({
      type: eventName,
      parentID: parentID,
      agentInfo: agentInfo,
      authorization: authorization,
    });
    this.logger.verbose?.(
      `Lifecycle (id: ${
        lifecycle.id
      }) event '${eventName}: from state '${restoredState.value.toString()}' to state '${machineService.state.value.toString()}', parentID: ${parentID}`,
      LogContext.LIFECYCLE
    );

    const stateToHydrate = interpretedLifecycle.state;
    // Note: https://git.com/statelyai/xstate/discussions/1757
    // restoring state has the hydrated actions, which unless removed will be executed again
    stateToHydrate.actions = [];
    // Remove also the event itself as this would otherwise pull all agent / authorization policy into the hydrated state
    stateToHydrate.event = '';
    stateToHydrate._event.data.agentInfo.credentials = '';
    stateToHydrate._event.data.agentInfo.verifiedCredentials = '';
    stateToHydrate._event.data.authorization = '';

    //stateToHydrate._event = un;
    const newStateStr = JSON.stringify(stateToHydrate);

    // Todo: do not stop as this triggers an exit action from the last state.
    //machineService.stop();
    lifecycle.machineState = newStateStr;

    return await this.lifecycleRepository.save(lifecycle);
  }

  async getLifecycleOrFail(
    lifecycleID: string,
    options?: FindOneOptions<Lifecycle>
  ): Promise<ILifecycle | never> {
    const lifecycle = await this.lifecycleRepository.findOne({
      where: { id: lifecycleID },
      ...options,
    });
    if (!lifecycle)
      throw new EntityNotFoundException(
        `Unable to find Lifecycle with ID: ${lifecycleID}`,
        LogContext.CHALLENGES
      );
    return lifecycle;
  }

  getRestoredStateDefinition(lifecycle: ILifecycle) {
    const machineDef = this.deserializeLifecycleDefinition(
      lifecycle.machineDef
    );
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
    const state = State.create(restoredStateDef);
    return state.value.toString();
  }

  getStates(lifecycle: ILifecycle): string[] {
    const restoredStateDef = this.getRestoredStateDefinition(lifecycle);
    const state = State.create(restoredStateDef);
    return state.toStrings();
  }

  isFinalState(lifecycle: ILifecycle): boolean {
    const restoredState = this.getRestoredState(lifecycle);
    const isFinal = restoredState.done;
    if (!isFinal) return false;
    return isFinal;
  }

  getTemplateIdentifier(lifecycle: ILifecycle): string {
    const templateID = this.deserializeLifecycleDefinition(
      lifecycle.machineDef
    ).id;
    return templateID;
  }

  getNextEvents(lifecycle: ILifecycle): string[] {
    const restoredState = this.getRestoredState(lifecycle);
    const next = restoredState.nextEvents;
    return next || [];
  }

  getMachineDefinition(lifecycle: ILifecycle): ILifecycleDefinition {
    return this.deserializeLifecycleDefinition(lifecycle.machineDef);
  }

  deserializeLifecycleDefinition(value: string): ILifecycleDefinition {
    const result: ILifecycleDefinition = JSON.parse(value);
    return result;
  }

  serializeLifecycleDefinition(definition: ILifecycleDefinition): string {
    const result = JSON.stringify(definition);
    return result;
  }

  async getParentID(lifecycle: ILifecycle) {
    const machineDefJson = this.deserializeLifecycleDefinition(
      lifecycle.machineDef
    );
    if (machineDefJson.context && machineDefJson.context.parentID) {
      return machineDefJson.context.parentID;
    }
    return '';
  }

  async save(lifecycle: Lifecycle): Promise<Lifecycle> {
    return await this.lifecycleRepository.save(lifecycle);
  }

  getRestoredState(lifecycle: ILifecycle) {
    const machineDef = this.deserializeLifecycleDefinition(
      lifecycle.machineDef
    );
    const machine = createMachine(machineDef);
    const restoredStateDefinition = this.getRestoredStateDefinition(lifecycle);
    return machine.resolveState(restoredStateDefinition);
  }
}
