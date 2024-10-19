import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  InvalidStateTransitionException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AnyMachineSnapshot,
  createActor,
  createMachine,
  MachineSnapshot,
} from 'xstate';
import { FindOneOptions, Repository } from 'typeorm';
import { Lifecycle } from './lifecycle.entity';
import { ILifecycle } from './lifecycle.interface';
import { LifecycleEventInput } from './dto/lifecycle.dto.event';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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

    return await this.save(lifecycle);
  }

  async deleteLifecycle(lifecycleID: string): Promise<ILifecycle> {
    const lifecycle = await this.getLifecycleOrFail(lifecycleID);
    return await this.lifecycleRepository.remove(lifecycle as Lifecycle);
  }

  async event(eventData: LifecycleEventInput): Promise<ILifecycle> {
    let lifecycle = await this.getLifecycleOrFail(eventData.ID);
    const eventName = eventData.eventName;

    this.logger.verbose?.(
      `[Lifecycle] Processing event: ${eventData.eventName}`,
      LogContext.LIFECYCLE
    );

    const actor = this.getActorWithState(lifecycle, {
      actions: eventData.actions,
      guards: eventData.guards,
    });

    const snapshot = actor.getSnapshot();
    const startingState = snapshot.value;
    const nextEvents = this.getNextEvents(snapshot);
    if (
      !nextEvents.find(name => {
        return name === eventName;
      })
    ) {
      const lifecycleMsgPrefix = `Lifecycle (${lifecycle.id}) event (${eventName}): `;
      const lifecycleMsgSuffix = `event: ${eventData.eventName}, starting state: ${startingState}`;
      if (nextEvents.length === 0) {
        throw new InvalidStateTransitionException(
          `${lifecycleMsgPrefix} No next states for lifecycle, ${lifecycleMsgSuffix}`,
          LogContext.LIFECYCLE
        );
      } else {
        throw new InvalidStateTransitionException(
          `${lifecycleMsgPrefix} Not in valid set of next events: ${nextEvents}, ${lifecycleMsgSuffix}`,
          LogContext.LIFECYCLE
        );
      }
    }

    this.logger.verbose?.(
      `[Lifecycle] machine interpreted, starting from state: ${startingState}`,
      LogContext.LIFECYCLE
    );

    actor.start();

    try {
      actor.send({
        type: eventName,
        agentInfo: eventData.agentInfo,
        authorization: eventData.authorization,
      });
    } catch (e) {
      this.logger.error?.(
        `Error processing lifecycle event: ${e}`,
        LogContext.LIFECYCLE
      );
      throw new InvalidStateTransitionException(
        `Unable to process event: ${eventName} on lifecycle ${lifecycle.id} - error: ${e}`,
        LogContext.LIFECYCLE
      );
    }

    const updatedState = actor.getSnapshot().value;

    const newStateStr = JSON.stringify(actor.getPersistedSnapshot());
    lifecycle.machineState = newStateStr;
    this.logger.verbose?.(
      `Lifecycle (id: ${
        lifecycle.id
      }) event '${eventName} completed: from state '${startingState}' to state '${updatedState}'`,
      LogContext.LIFECYCLE
    );
    lifecycle = await this.lifecycleRepository.save(lifecycle);

    return lifecycle;
  }

  private getNextEvents(snapshot: AnyMachineSnapshot) {
    const notes = snapshot._nodes;
    if (!notes) {
      this.logger.warn(
        `No nodes found in snapshot: ${JSON.stringify(snapshot)}`,
        LogContext.LIFECYCLE
      );
      return [];
    }
    return [...new Set([...snapshot._nodes.flatMap(sn => sn.ownEvents)])];
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
        LogContext.SPACES
      );
    return lifecycle;
  }

  getRestoredSnapshot(
    lifecycle: ILifecycle
  ): MachineSnapshot<any, any, any, any, any, any, any, any> | undefined {
    const stateStr = lifecycle.machineState;
    if (!stateStr) return undefined;
    return JSON.parse(stateStr);
  }

  public getState(lifecycle: ILifecycle): string {
    const actor = this.getActorWithState(lifecycle);
    const snapshot = actor.getSnapshot();
    return snapshot.value;
  }

  isFinalState(lifecycle: ILifecycle): boolean {
    const actor = this.getActorWithState(lifecycle);

    const isFinal = actor.getSnapshot().status === 'done';
    if (!isFinal) return false;
    return isFinal;
  }

  getMachineDefinitionIdentifier(lifecycle: ILifecycle): string {
    const templateID = this.deserializeLifecycleDefinition(
      lifecycle.machineDef
    ).id;
    return templateID;
  }

  public getActorWithState(lifecycle: ILifecycle, options?: any): any {
    const machineDef = this.deserializeLifecycleDefinition(
      lifecycle.machineDef
    );

    let machine = createMachine(machineDef);
    if (options) {
      machine = machine.provide(options);
    }
    const restoredState = this.getRestoredSnapshot(lifecycle);
    const actor = createActor(machine, {
      snapshot: restoredState,
    });
    actor.subscribe(snapshot => {
      this.logger.verbose?.(
        `XState machine state changed to ${snapshot.value}`,
        LogContext.LIFECYCLE
      );
    });
    actor.subscribe({
      error: error => {
        this.logger.error(
          `XState machine error ${error}`,
          LogContext.LIFECYCLE
        );
      },
    });
    return actor;
  }

  getNextEventsOld(lifecycle: ILifecycle): string[] {
    const actor = this.getActorWithState(lifecycle);
    const snapshot = actor.getSnapshot();
    const nextEvents = this.getNextEvents(snapshot);
    return nextEvents || [];
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
}
