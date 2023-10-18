import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import {
  EntityNotInitializedException,
  InvalidStateTransitionException,
} from '@common/exceptions';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { WhiteboardCheckoutEventInput } from './dto/whiteboard.checkout.dto.event';
import { IWhiteboardCheckout } from './whiteboard.checkout.interface';
import { WhiteboardCheckoutService } from './whiteboard.checkout.service';

@Injectable()
export class WhiteboardCheckoutLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private whiteboardCheckoutService: WhiteboardCheckoutService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnWhiteboardCheckout(
    whiteboardCheckoutEventData: WhiteboardCheckoutEventInput,
    agentInfo: AgentInfo
  ): Promise<IWhiteboardCheckout> {
    const eventName = whiteboardCheckoutEventData.eventName;
    const whiteboardCheckout =
      await this.whiteboardCheckoutService.getWhiteboardCheckoutOrFail(
        whiteboardCheckoutEventData.whiteboardCheckoutID
      );

    if (!whiteboardCheckout.lifecycle)
      throw new EntityNotInitializedException(
        `Whiteboard checkout Lifecycle not initialized on WhiteboardCheckout: ${whiteboardCheckout.id}`,
        LogContext.CONTEXT
      );

    this.logCheckoutStatus(eventName, whiteboardCheckout, 'event triggered');

    try {
      await this.lifecycleService.event(
        {
          ID: whiteboardCheckout.lifecycle.id,
          eventName: eventName,
        },
        this.whiteboardCheckoutLifecycleMachineOptions,
        agentInfo,
        whiteboardCheckout.authorization
      );
    } catch (error) {
      const isTransitionError =
        error instanceof InvalidStateTransitionException;

      if (
        whiteboardCheckoutEventData.errorOnFailedTransition ||
        !isTransitionError
      ) {
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
    const updatedWhiteboardCheckout =
      await this.whiteboardCheckoutService.getWhiteboardCheckoutOrFail(
        whiteboardCheckout.id
      );

    this.logCheckoutStatus(
      eventName,
      updatedWhiteboardCheckout,
      'returning updated whiteboardCheckout'
    );
    return updatedWhiteboardCheckout;
  }

  public whiteboardCheckoutLifecycleMachineOptions: Partial<
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
        const whiteboardCheckout =
          await this.whiteboardCheckoutService.getWhiteboardCheckoutOrFail(
            event.parentID,
            {
              relations: ['lifecycle'],
            }
          );

        whiteboardCheckout.lockedBy = event.agentInfo.userID;
        const updatedWhiteboardCheckout =
          await this.whiteboardCheckoutService.save(whiteboardCheckout);
        this.logCheckoutStatus(
          event.type,
          updatedWhiteboardCheckout,
          'checkout command completed'
        );
      },
      checkin: async (_, event: any) => {
        const whiteboardCheckout =
          await this.whiteboardCheckoutService.getWhiteboardCheckoutOrFail(
            event.parentID,
            {
              relations: ['lifecycle'],
            }
          );

        whiteboardCheckout.lockedBy = '';
        const updatedWhiteboardCheckout =
          await this.whiteboardCheckoutService.save(whiteboardCheckout);

        this.logCheckoutStatus(
          event.type,
          updatedWhiteboardCheckout,
          'checkin command completed'
        );
      },
    },
    guards: {
      // To actually assign the verified status the GRANT privilege is needed on the verification
      WhiteboardCheckoutAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        const result = this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.READ
        );
        this.logger.verbose?.(
          `[Guard ${event.type}] Whiteboard checkout authorized: ${result}`,
          LogContext.CONTEXT
        );
        return result;
      },
      WhiteboardCheckinAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        const result = this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.UPDATE
        );
        this.logger.verbose?.(
          `[Guard ${event.type}] Whiteboard checkin authorized: ${result}`,
          LogContext.CONTEXT
        );
        return result;
      },
    },
  };

  private logCheckoutStatus(
    eventName: string,
    whiteboardCheckout: IWhiteboardCheckout,
    msg: string
  ) {
    if (!whiteboardCheckout.lifecycle)
      throw new EntityNotInitializedException(
        `Whiteboard checkout Lifecycle not initialized on WhiteboardCheckout: ${whiteboardCheckout.id}`,
        LogContext.CONTEXT
      );
    const status = this.lifecycleService.getState(whiteboardCheckout.lifecycle);
    this.logger.verbose?.(
      `[Action ${eventName}] - ${msg} - state: ${status} and checked out by: ${whiteboardCheckout.lockedBy}`,
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
