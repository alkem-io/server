import { Injectable } from '@nestjs/common';
import { CanvasCheckout } from './canvas.checkout.entity';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';
import { CanvasCheckoutLifecycleConfig } from './canvas.checkout.lifecycle.config';
import { CreateCanvasCheckoutInput } from './dto/canvascheckout.dto.create';

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
    const canvasCheckout: ICanvasCheckout = CanvasCheckout.create(checkoutData);
    canvasCheckout.status = CanvasCheckoutStateEnum.AVAILABLE;
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

  async save(CanvasCheckout: ICanvasCheckout): Promise<ICanvasCheckout> {
    return await this.canvasCheckoutRepository.save(CanvasCheckout);
  }
  async getCanvasCheckoutOrFail(
    CanvasCheckoutID: string,
    options?: FindOneOptions<CanvasCheckout>
  ): Promise<ICanvasCheckout> {
    const CanvasCheckout = await this.canvasCheckoutRepository.findOne(
      { id: CanvasCheckoutID },
      options
    );
    if (!CanvasCheckout)
      throw new EntityNotFoundException(
        `Unable to find CanvasCheckout with ID: ${CanvasCheckoutID}`,
        LogContext.COMMUNITY
      );
    return CanvasCheckout;
  }
}
