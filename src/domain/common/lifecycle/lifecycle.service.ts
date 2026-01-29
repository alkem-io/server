import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  InvalidStateTransitionException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { AnyMachineSnapshot, AnyStateMachine, createActor } from 'xstate';
import { LifecycleEventInput } from './dto/lifecycle.dto.event';
import { Lifecycle } from './lifecycle.entity';
import { ILifecycle } from './lifecycle.interface';

@Injectable()
export class LifecycleService {
  private XSTATE_DONE_STATE = 'done';
  private XSTATE_ERROR_STATE = 'error';

  constructor(
    @InjectRepository(Lifecycle)
    private lifecycleRepository: Repository<Lifecycle>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createLifecycle(): Promise<ILifecycle> {
    const lifecycle = new Lifecycle();

    return this.save(lifecycle);
  }

  async deleteLifecycle(lifecycleID: string): Promise<ILifecycle> {
    const lifecycle = await this.getLifecycleOrFail(lifecycleID);
    return this.lifecycleRepository.remove(lifecycle as Lifecycle);
  }

  async event(eventData: LifecycleEventInput): Promise<ILifecycle> {
    const eventName = eventData.eventName;

    this.logger.verbose?.(
      `[Lifecycle] Processing event: ${eventData.eventName}`,
      LogContext.LIFECYCLE
    );

    const actor = this.getActorWithState(
      eventData.lifecycle,
      eventData.machine
    );

    const snapshot = actor.getSnapshot();
    if (snapshot.status === this.XSTATE_ERROR_STATE) {
      throw new InvalidStateTransitionException(
        `Actor in error state: ${JSON.stringify(snapshot)}`,
        LogContext.LIFECYCLE
      );
    }
    const startingState = snapshot.value;
    const nextEvents = this.getNextEventsFromSnapshot(snapshot);
    if (
      !nextEvents.find(name => {
        return name === eventName;
      })
    ) {
      const lifecycleMsgPrefix = `Lifecycle (${eventData.lifecycle.id}) event (${eventName}): `;
      const lifecycleMsgSuffix = `event: ${eventData.eventName}, starting state: ${startingState}`;
      if (nextEvents.length === 0) {
        throw new InvalidStateTransitionException(
          `${lifecycleMsgPrefix} No next states for lifecycle currently in state, ${lifecycleMsgSuffix}`,
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
    } catch (e: any) {
      this.logger.error?.(
        `Error processing lifecycle event: ${e}`,
        LogContext.LIFECYCLE
      );
      throw new InvalidStateTransitionException(
        `Unable to process event: ${eventName} on lifecycle ${eventData.lifecycle.id} - error: ${e.message}`,
        LogContext.LIFECYCLE
      );
    }

    const updatedState = actor.getSnapshot().value;
    if (updatedState === startingState) {
      this.logger.warn(
        `Event ${eventName} did not change state from ${startingState}`,
        LogContext.LIFECYCLE
      );
    }

    const newStateStr = JSON.stringify(actor.getPersistedSnapshot());
    eventData.lifecycle.machineState = newStateStr;
    this.logger.verbose?.(
      `Lifecycle (id: ${
        eventData.lifecycle.id
      }) event '${eventName}' completed: from state '${startingState}' to state '${updatedState}'`,
      LogContext.LIFECYCLE
    );
    return await this.lifecycleRepository.save(eventData.lifecycle);
  }

  private getNextEventsFromSnapshot(snapshot: AnyMachineSnapshot) {
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

  public async getLifecycleOrFail(
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

  private getRestoredSnapshot(
    lifecycle: ILifecycle
  ): AnyMachineSnapshot | undefined {
    const stateStr = lifecycle.machineState;
    if (!stateStr) return undefined;
    return JSON.parse(stateStr);
  }

  public getState(lifecycle: ILifecycle, machine: AnyStateMachine): string {
    const actor = this.getActorWithState(lifecycle, machine);
    const snapshot = actor.getSnapshot();
    return snapshot.value;
  }

  public isFinalState(
    lifecycle: ILifecycle,
    machine: AnyStateMachine
  ): boolean {
    const actor = this.getActorWithState(lifecycle, machine);

    return actor.getSnapshot().status === this.XSTATE_DONE_STATE;
  }

  // Note: cannot return a stronger typing than "any" as this then impacts the events that can be sent
  // Need to add stronger typing to all the machines in terms of event types to be able to put AnyActor
  // as the return type
  private getActorWithState(
    lifecycle: ILifecycle,
    machine: AnyStateMachine
  ): any {
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

  getNextEvents(lifecycle: ILifecycle, machine: AnyStateMachine): string[] {
    const actor = this.getActorWithState(lifecycle, machine);
    const snapshot = actor.getSnapshot();
    const nextEvents = this.getNextEventsFromSnapshot(snapshot);
    return nextEvents || [];
  }

  async save(lifecycle: Lifecycle): Promise<Lifecycle> {
    return await this.lifecycleRepository.save(lifecycle);
  }
}
