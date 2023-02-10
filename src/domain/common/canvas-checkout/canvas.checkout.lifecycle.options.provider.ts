import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { CanvasCheckoutEventInput } from './dto/canvas.checkout.dto.event';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { CanvasCheckoutService } from './canvas.checkout.service';

@Injectable()
export class CanvasCheckoutLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private canvasCheckoutService: CanvasCheckoutService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnCanvasCheckout(
    canvasCheckoutEventData: CanvasCheckoutEventInput,
    agentInfo: AgentInfo
  ): Promise<ICanvasCheckout> {
    const eventName = canvasCheckoutEventData.eventName;
    const canvasCheckout =
      await this.canvasCheckoutService.getCanvasCheckoutOrFail(
        canvasCheckoutEventData.canvasCheckoutID
      );

    if (!canvasCheckout.lifecycle)
      throw new EntityNotInitializedException(
        `Canvas checkout Lifecycle not initialized on CanvasCheckout: ${canvasCheckout.id}`,
        LogContext.CONTEXT
      );

    this.logCheckoutStatus(eventName, canvasCheckout, 'event triggered');

    try {
      await this.lifecycleService.event(
        {
          ID: canvasCheckout.lifecycle.id,
          eventName: eventName,
        },
        this.CanvasCheckoutLifecycleMachineOptions,
        agentInfo,
        canvasCheckout.authorization
      );
    } catch (error) {
      if (canvasCheckoutEventData.errorOnFailedTransition) {
        throw error;
      } else {
        this.logger.warn(
          `Transition failed on event '${eventName}': ${error}`,
          LogContext.CONTEXT
        );
      }
    }

    // Todo: there is likely a race condition related to lifecycles + events they trigger.
    // Events that are triggered by XState are fire and forget. So they above event will potentially return
    // before all the actions that were triggered by the event have completed.
    const updatedCanvasCheckout =
      await this.canvasCheckoutService.getCanvasCheckoutOrFail(
        canvasCheckout.id
      );

    this.logCheckoutStatus(
      eventName,
      updatedCanvasCheckout,
      'returning updated canvasCheckout'
    );
    return updatedCanvasCheckout;
  }
  private CanvasCheckoutLifecycleMachineOptions: Partial<
    MachineOptions<any, any>
  > = {
    actions: {
      availableEntry: (_, __) => {
        this.logMessage('availableEntry...');
      },
      availableTransition: (_, __) => {
        this.logMessage('availableTransition...');
      },
      availableExit: (_, __) => {
        this.logMessage('availableExit!');
      },
      lockedEntry: (_, __) => {
        this.logMessage('lockedEntry!');
      },
      lockedTransition: (_, __) => {
        this.logMessage('lockedTransition...');
      },
      lockedExit: (_, __) => {
        this.logMessage('lockedExit:');
      },
      checkout: async (_, event: any) => {
        const canvasCheckout =
          await this.canvasCheckoutService.getCanvasCheckoutOrFail(
            event.parentID,
            {
              relations: ['lifecycle'],
            }
          );

        canvasCheckout.lockedBy = event.agentInfo.userID;
        const updatedCanvasCheckout = await this.canvasCheckoutService.save(
          canvasCheckout
        );
        this.logCheckoutStatus(
          event.type,
          updatedCanvasCheckout,
          'checkout command completed'
        );
      },
      checkin: async (_, event: any) => {
        const canvasCheckout =
          await this.canvasCheckoutService.getCanvasCheckoutOrFail(
            event.parentID,
            {
              relations: ['lifecycle'],
            }
          );

        canvasCheckout.lockedBy = '';
        const updatedCanvasCheckout = await this.canvasCheckoutService.save(
          canvasCheckout
        );

        this.logCheckoutStatus(
          event.type,
          updatedCanvasCheckout,
          'checkin command completed'
        );
      },
    },
    guards: {
      // To actually assign the verified status the GRANT privilege is needed on the verification
      CanvasCheckoutAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        const result = this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.READ
        );
        this.logger.verbose?.(
          `[Guard ${event.type}] Canvas checkout authorized: ${result}`,
          LogContext.CONTEXT
        );
        return result;
      },
      CanvasCheckinAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        const result = this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.UPDATE
        );
        this.logger.verbose?.(
          `[Guard ${event.type}] Canvas checkin authorized: ${result}`,
          LogContext.CONTEXT
        );
        return result;
      },
    },
  };

  private logCheckoutStatus(
    eventName: string,
    canvasCheckout: ICanvasCheckout,
    msg: string
  ) {
    if (!canvasCheckout.lifecycle)
      throw new EntityNotInitializedException(
        `Canvas checkout Lifecycle not initialized on CanvasCheckout: ${canvasCheckout.id}`,
        LogContext.CONTEXT
      );
    const status = this.lifecycleService.getState(canvasCheckout.lifecycle);
    this.logger.verbose?.(
      `[Action ${eventName}] - ${msg} - state: ${status} and checked out by: ${canvasCheckout.lockedBy}`,
      LogContext.CONTEXT
    );
  }

  private logMessage(msg: string) {
    const logActions = true;
    if (logActions) {
      this.logger.verbose?.(
        `[Lifecycle] Context checkout provider - ${msg}`,
        LogContext.LIFECYCLE
      );
    }
  }
}
