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
      LogContext.COMMUNITY
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
            LogContext.COMMUNITY
          );
        }
        canvasCheckout.status = CanvasCheckoutStateEnum.CHECKED_OUT;
        canvasCheckout.lockedBy = event.agentInfo.userID;
        await this.canvasCheckoutService.save(canvasCheckout);
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
            `Verification Lifecycle not initialized on Organization: ${canvasCheckout.id}`,
            LogContext.COMMUNITY
          );
        }
        canvasCheckout.status = CanvasCheckoutStateEnum.AVAILABLE;
        canvasCheckout.lockedBy = '';
        await this.canvasCheckoutService.save(canvasCheckout);
      },
    },
    guards: {
      // To actually assign the verified status the GRANT privilege is needed on the verification
      CanvasCheckoutAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        return this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.READ
        );
      },
      CanvasCheckinAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: IAuthorizationPolicy = event.authorization;
        return this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.UPDATE
        );
      },
    },
  };
}
