import { Injectable } from '@nestjs/common';
import { CanvasCheckout } from './canvas.checkout.entity';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotFoundException,
  InvalidStateTransitionException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';
import { CanvasCheckoutLifecycleConfig } from './canvas.checkout.lifecycle.config';
import { CreateCanvasCheckoutInput } from './dto/canvascheckout.dto.create';
import { EntityCheckoutStatusException } from '@common/exceptions/entity.not.checkedout.exception';
import { AgentInfo } from '@core/authentication/agent-info';

@Injectable()
export class CanvasCheckoutService {
  constructor(
    @InjectRepository(CanvasCheckout)
    private canvasCheckoutRepository: Repository<CanvasCheckout>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private lifecycleService: LifecycleService
  ) {}

  async createCanvasCheckout(
    checkoutData: CreateCanvasCheckoutInput
  ): Promise<ICanvasCheckout> {
    const canvasCheckout: ICanvasCheckout = CanvasCheckout.create({
      ...checkoutData,
    });
    canvasCheckout.authorization = new AuthorizationPolicy();

    // save the user to get the id assigned
    await this.canvasCheckoutRepository.save(canvasCheckout);

    // Create the lifecycle
    canvasCheckout.lifecycle = await this.lifecycleService.createLifecycle(
      canvasCheckout.id,
      CanvasCheckoutLifecycleConfig
    );

    return this.save(canvasCheckout);
  }

  async delete(CanvasCheckoutID: string): Promise<ICanvasCheckout> {
    const canvasCheckout = await this.getCanvasCheckoutOrFail(CanvasCheckoutID);

    if (canvasCheckout.authorization)
      await this.authorizationPolicyService.delete(
        canvasCheckout.authorization
      );

    if (canvasCheckout.lifecycle)
      await this.lifecycleService.deleteLifecycle(canvasCheckout.lifecycle.id);

    const result = await this.canvasCheckoutRepository.remove(
      canvasCheckout as CanvasCheckout
    );
    result.id = CanvasCheckoutID;
    return result;
  }

  async save(canvasCheckout: ICanvasCheckout): Promise<ICanvasCheckout> {
    return await this.canvasCheckoutRepository.save(canvasCheckout);
  }

  async getCanvasCheckoutOrFail(
    canvasCheckoutID: string,
    options?: FindOneOptions<CanvasCheckout>
  ): Promise<ICanvasCheckout> {
    const canvasCheckout = await this.canvasCheckoutRepository.findOne({
      where: { id: canvasCheckoutID },
      ...options,
    });
    if (!canvasCheckout)
      throw new EntityNotFoundException(
        `Unable to find CanvasCheckout with ID: ${canvasCheckoutID}`,
        LogContext.COMMUNITY
      );
    return canvasCheckout;
  }

  async isUpdateAllowedOrFail(
    checkout: ICanvasCheckout,
    agentInfo: AgentInfo
  ): Promise<void> {
    const status = this.getCanvasStatus(checkout);
    if (status !== CanvasCheckoutStateEnum.CHECKED_OUT) {
      throw new EntityCheckoutStatusException(
        `Unable to update entity that is not checkedout: ${status}`,
        LogContext.CONTEXT
      );
    }
    if (checkout.lockedBy !== agentInfo.userID) {
      throw new EntityCheckoutStatusException(
        `Entity is checked out by ${checkout.lockedBy}, which does not match the current user: ${agentInfo.userID}`,
        LogContext.CONTEXT
      );
    }
  }

  getCanvasStatus(canvasCheckout: ICanvasCheckout): CanvasCheckoutStateEnum {
    const lifecycle = canvasCheckout.lifecycle;
    if (!lifecycle) {
      throw new EntityNotFoundException(
        `Unable to find lifecycle CanvasCheckout with ID: ${canvasCheckout.id}`,
        LogContext.COMMUNITY
      );
    }
    const state = this.lifecycleService.getState(lifecycle);
    if (state === CanvasCheckoutStateEnum.AVAILABLE) {
      return CanvasCheckoutStateEnum.AVAILABLE;
    } else if (state === CanvasCheckoutStateEnum.CHECKED_OUT) {
      return CanvasCheckoutStateEnum.CHECKED_OUT;
    } else {
      throw new InvalidStateTransitionException(
        `Unable to find lifecycle CanvasCheckout with expected state: ${canvasCheckout.id}`,
        LogContext.CONTEXT
      );
    }
  }
}
