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
import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';

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
    const canvasCheckout =
      await this.canvasCheckoutService.getCanvasCheckoutOrFail(
        canvasCheckoutEventData.canvasCheckoutID
      );

    if (!canvasCheckout.lifecycle)
      throw new EntityNotInitializedException(
        `Canvas checkout Lifecycle not initialized on CanvasCheckout: ${canvasCheckout.id}`,
        LogContext.CONTEXT
      );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${canvasCheckoutEventData.eventName} triggered on canvasCheckout: ${canvasCheckout.id} using lifecycle ${canvasCheckout.lifecycle.id}`,
      LogContext.CONTEXT
    );

    await this.lifecycleService.event(
      {
        ID: canvasCheckout.lifecycle.id,
        eventName: canvasCheckoutEventData.eventName,
      },
      this.CanvasCheckoutLifecycleMachineOptions,
      agentInfo,
      canvasCheckout.authorization
    );

    return await this.canvasCheckoutService.getCanvasCheckoutOrFail(
      canvasCheckout.id
    );
  }

  private CanvasCheckoutLifecycleMachineOptions: Partial<
    MachineOptions<any, any>
  > = {
    actions: {
      checkout: async (_, event: any) => {
        const canvasCheckout =
          await this.canvasCheckoutService.getCanvasCheckoutOrFail(
            event.parentID,
            {
              relations: ['lifecycle'],
            }
          );
        const lifecycle = canvasCheckout.lifecycle;
        if (!lifecycle) {
          throw new EntityNotInitializedException(
            `Verification Lifecycle not initialized on Organization: ${canvasCheckout.id}`,
            LogContext.CONTEXT
          );
        }
        canvasCheckout.status = CanvasCheckoutStateEnum.CHECKED_OUT;
        canvasCheckout.lockedBy = event.agentInfo.userID;
        await this.canvasCheckoutService.save(canvasCheckout);
        this.logger.verbose?.(
          `[Action ${event.type}] Canvas check out completed; new state: ${canvasCheckout.status}`,
          LogContext.CONTEXT
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
        const lifecycle = canvasCheckout.lifecycle;
        if (!lifecycle) {
          throw new EntityNotInitializedException(
            `Verification Lifecycle not initialized on Organization: ${canvasCheckout.status}`,
            LogContext.CONTEXT
          );
        }
        canvasCheckout.status = CanvasCheckoutStateEnum.AVAILABLE;
        canvasCheckout.lockedBy = '';
        await this.canvasCheckoutService.save(canvasCheckout);
        this.logger.verbose?.(
          `[Action ${event.type}] Canvas checked in completed; new state: ${canvasCheckout.status}`,
          LogContext.CONTEXT
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
}
